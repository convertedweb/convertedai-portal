import { canViewProjects } from "@/lib/admin-permissions";
import { getAssignableAdminUsers, getProjectManagementData } from "@/lib/project-management";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, monthRangeOf, splitByDay, weekStartOf } from "@/lib/timesheet";

export type TimesheetParams = { customer?: string; date?: string; period?: string; project?: string; status?: string; user?: string };

// A timesheet oldal és a CSV export közös adatforrása; a láthatósági szabályok itt vannak egy helyen.
export async function getTimesheetData(params: TimesheetParams) {
  const [{ access, schemaReady, tasks }, assignable] = await Promise.all([getProjectManagementData(), getAssignableAdminUsers()]);
  const allowed = Boolean(access.user && canViewProjects(access.role, access.permissions));
  const monthly = params.period === "month";
  const range = monthly
    ? monthRangeOf(params.date)
    : { end: addDays(weekStartOf(params.date), 6), start: weekStartOf(params.date) };

  const taskById = new Map(tasks
    .filter((task) => (!params.customer || task.organizationId === params.customer) && (!params.project || task.project_id === params.project) && (!params.status || task.status === params.status))
    .map((task) => [task.id, task]));

  // Superadmin mindenkit lát; az admin a sajátját és a többi admint, a superadmint nem.
  const me = access.user?.id ?? "";
  const visibleUsers = assignable.filter((user) => access.role === "superadmin" || user.role === "admin" || user.id === me);
  const userName = new Map(visibleUsers.map((user) => [user.id, user.id === me ? `${user.name} (te)` : user.name]));
  const scope = params.user === "all" ? "all" : params.user && userName.has(params.user) ? params.user : me;
  const scopedUserIds = scope === "all" ? visibleUsers.map((user) => user.id) : [scope];

  const now = Date.now();
  const adminSupabase = allowed ? createAdminClient() : null;
  // ±1-2 nap ráhagyás, mert a határokat budapesti napokra bontjuk.
  const { data: rows } = adminSupabase
    ? await adminSupabase
      .from("task_time_entries")
      .select("id, task_id, user_id, started_at, ended_at")
      .in("user_id", scopedUserIds)
      .lt("started_at", new Date(`${addDays(range.end, 2)}T00:00:00Z`).toISOString())
      .or(`ended_at.is.null,ended_at.gte.${new Date(`${addDays(range.start, -1)}T00:00:00Z`).toISOString()}`)
      .order("started_at", { ascending: true })
    : { data: null };

  // Az éjfélt átívelő bejegyzések napokra bontva szerepelnek.
  const entries = (rows ?? [])
    .filter((row) => taskById.has(row.task_id))
    .flatMap((row) => splitByDay(new Date(row.started_at), row.ended_at ? new Date(row.ended_at) : new Date(now)).map((segment) => ({
      day: segment.day,
      from: segment.from,
      id: `${row.id}-${segment.day}`,
      ms: segment.ms,
      running: !row.ended_at && segment.to.getTime() === now,
      task_id: row.task_id,
      to: segment.to,
      user_id: row.user_id,
    })))
    .filter((entry) => entry.day >= range.start && entry.day <= range.end);

  return { access, allowed, allTasks: tasks, entries, me, monthly, range, schemaReady, scope, taskById, userName, visibleUsers };
}
