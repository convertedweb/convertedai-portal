import { CirclePause } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { getAssignableAdminUsers, getProjectManagementData, getTaskActivity } from "@/lib/project-management";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArchiveTaskButton } from "./archive-task-button";
import { DeleteTaskButton } from "./delete-task-button";
import { TaskActivity } from "./task-activity";
import { TaskDetailTabs } from "./task-detail-tabs";
import { TaskEditForm } from "./task-edit-form";
import { TaskTimer, type TimeEntry } from "./task-timer";

// Közös tartalom: a teljes oldal és a lista fölötti oldalpanel is ezt rendereli.
export async function TaskDetail({ id }: { id: string }) {
  const { access, customers, projects, schemaReady, tasks } = await getProjectManagementData();

  if (!access.role) {
    return <div className="access-denied"><div className="access-denied-icon"><CirclePause size={28} /></div><h1>Nincs admin hozzáférés</h1><p>A feladat szerkesztéséhez admin jogosultság szükséges.</p><Link className="button" href="/login?next=/admin/tasks">Belépés</Link></div>;
  }
  if (!schemaReady) {
    return <div className="empty-panel task-schema-warning"><CirclePause size={24} /><div><strong>A projektmenedzsment adatbázisa nem érhető el.</strong><p>Próbáld újra később.</p></div></div>;
  }

  const task = tasks.find((item) => item.id === id);
  if (!task) notFound();
  const [activities, assignees] = await Promise.all([getTaskActivity(task.id), getAssignableAdminUsers()]);

  const adminSupabase = createAdminClient();
  const { data: timeRows } = adminSupabase
    ? await adminSupabase.from("task_time_entries").select("id, user_id, started_at, ended_at").eq("task_id", task.id).order("started_at", { ascending: false }).limit(100)
    : { data: null };
  const entries: TimeEntry[] = (timeRows ?? []).map((row) => ({ id: row.id, mine: row.user_id === access.user?.id, startedAt: row.started_at, endedAt: row.ended_at }));

  return (
    <div className="task-detail-compact">
      <div className="task-detail-compact-header">
        <p className="eyebrow">{getAdminRoleLabel(access.role)} · Feladat</p>
      </div>
      <TaskEditForm assignees={assignees} allowSuperadminOnly={access.role === "superadmin"} customers={customers} projects={projects} task={task} />
      <TaskDetailTabs activity={<TaskActivity activities={activities} />} time={<TaskTimer entries={entries} taskId={task.id} />} />
      <div className="task-detail-footer">{task.status !== "archived" && <ArchiveTaskButton taskId={task.id} />}{access.role === "superadmin" && <DeleteTaskButton taskId={task.id} taskTitle={task.title} />}</div>
    </div>
  );
}
