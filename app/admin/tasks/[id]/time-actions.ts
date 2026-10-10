"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { budapestDateTime } from "@/lib/timesheet";

export type TimeActionState = { error?: string; success?: string };

async function authorize(taskId: string) {
  if (!taskId) return { error: "Hiányzik a feladat azonosítója." };
  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return { error: "Az időméréshez admin jogosultság szükséges." };
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "Hiányzik a Supabase szerveroldali kulcs." };

  const { data: task } = await adminSupabase
    .from("tasks")
    .select("id, organization_id, visibility, organizations(superadmin_only)")
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle();
  const org = Array.isArray(task?.organizations) ? task.organizations[0] : task?.organizations;
  if (!task || ((task.visibility === "superadmin_only" || org?.superadmin_only) && access.role !== "superadmin")) {
    return { error: "A feladat nem található." };
  }
  return { adminSupabase, organizationId: task.organization_id as string, userId: access.user.id };
}

export async function startTaskTimer(_previousState: TimeActionState, formData: FormData): Promise<TimeActionState> {
  const taskId = String(formData.get("taskId") ?? "");
  const auth = await authorize(taskId);
  if ("error" in auth) return { error: auth.error };

  // A felhasználó korábbi futó időmérője (másik feladaton) automatikusan leáll.
  const now = new Date().toISOString();
  await auth.adminSupabase.from("task_time_entries").update({ ended_at: now }).eq("user_id", auth.userId).is("ended_at", null);
  const { error } = await auth.adminSupabase
    .from("task_time_entries")
    .insert({ task_id: taskId, organization_id: auth.organizationId, user_id: auth.userId, started_at: now });
  if (error) {
    console.error("Task timer start failed", error);
    return { error: "Nem sikerült elindítani az időmérőt." };
  }
  revalidatePath("/admin", "layout");
  return {};
}

export async function stopTaskTimer(_previousState: TimeActionState, formData: FormData): Promise<TimeActionState> {
  const taskId = String(formData.get("taskId") ?? "");
  const auth = await authorize(taskId);
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.adminSupabase
    .from("task_time_entries")
    .update({ ended_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .eq("user_id", auth.userId)
    .is("ended_at", null);
  if (error) {
    console.error("Task timer stop failed", error);
    return { error: "Nem sikerült leállítani az időmérőt." };
  }
  revalidatePath("/admin", "layout");
  return {};
}

// Csak a saját, már lezárt bejegyzés módosítható/törölhető; a futót előbb le kell állítani.
async function authorizeEntry(entryId: string) {
  if (!entryId) return { error: "Hiányzik a bejegyzés azonosítója." };
  const access = await getCurrentAdminAccess();
  const adminSupabase = createAdminClient();
  if (!access.user || !access.role || !adminSupabase) return { error: "Az időméréshez admin jogosultság szükséges." };
  const { data: entry } = await adminSupabase.from("task_time_entries").select("id, task_id, user_id, ended_at").eq("id", entryId).maybeSingle();
  if (!entry || entry.user_id !== access.user.id) return { error: "A bejegyzés nem található." };
  if (!entry.ended_at) return { error: "A futó időmérőt előbb állítsd le." };
  const auth = await authorize(entry.task_id);
  if ("error" in auth) return { error: auth.error };
  return { adminSupabase, taskId: entry.task_id as string, userId: access.user.id };
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

function parseRange(formData: FormData) {
  const day = String(formData.get("date") ?? "");
  const startedAt = budapestDateTime(day, String(formData.get("from") ?? ""));
  const endedAt = budapestDateTime(day, String(formData.get("to") ?? ""));
  if (!startedAt || !endedAt) return { error: "Érvénytelen dátum vagy időpont." };
  if (endedAt <= startedAt) return { error: "A befejezés legyen a kezdés után (azonos napon belül)." };
  if (endedAt.getTime() > Date.now() + 60_000) return { error: "A bejegyzés nem lehet a jövőben." };
  return { endedAt, startedAt };
}

// Egy felhasználó bejegyzései nem fedhetik egymást; a futó bejegyzés a mostanig tart.
async function overlapsOther(adminSupabase: AdminClient, userId: string, startedAt: Date, endedAt: Date, excludeId?: string) {
  let query = adminSupabase
    .from("task_time_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .lt("started_at", endedAt.toISOString())
    .or(`ended_at.is.null,ended_at.gt.${startedAt.toISOString()}`);
  if (excludeId) query = query.neq("id", excludeId);
  const { count, error } = await query;
  return error ? null : (count ?? 0) > 0;
}

const overlapMessage = "Az időszak átfedésben van egy másik bejegyzéseddel.";

export async function addTimeEntry(_previousState: TimeActionState, formData: FormData): Promise<TimeActionState> {
  const taskId = String(formData.get("taskId") ?? "");
  const auth = await authorize(taskId);
  if ("error" in auth) return { error: auth.error };
  const range = parseRange(formData);
  if ("error" in range) return { error: range.error };

  const overlap = await overlapsOther(auth.adminSupabase, auth.userId, range.startedAt, range.endedAt);
  if (overlap === null) return { error: "Nem sikerült ellenőrizni az átfedést." };
  if (overlap) return { error: overlapMessage };

  const { error } = await auth.adminSupabase.from("task_time_entries").insert({
    ended_at: range.endedAt.toISOString(),
    organization_id: auth.organizationId,
    started_at: range.startedAt.toISOString(),
    task_id: taskId,
    user_id: auth.userId,
  });
  if (error) {
    console.error("Time entry insert failed", error);
    return { error: "Nem sikerült rögzíteni az időt." };
  }
  revalidatePath("/admin", "layout");
  return { success: "Rögzítve." };
}

export async function updateTimeEntry(_previousState: TimeActionState, formData: FormData): Promise<TimeActionState> {
  const entryId = String(formData.get("entryId") ?? "");
  const auth = await authorizeEntry(entryId);
  if ("error" in auth) return { error: auth.error };
  const range = parseRange(formData);
  if ("error" in range) return { error: range.error };

  const overlap = await overlapsOther(auth.adminSupabase, auth.userId, range.startedAt, range.endedAt, entryId);
  if (overlap === null) return { error: "Nem sikerült ellenőrizni az átfedést." };
  if (overlap) return { error: overlapMessage };

  const { error } = await auth.adminSupabase
    .from("task_time_entries")
    .update({ ended_at: range.endedAt.toISOString(), started_at: range.startedAt.toISOString() })
    .eq("id", entryId);
  if (error) {
    console.error("Time entry update failed", error);
    return { error: "Nem sikerült menteni a bejegyzést." };
  }
  revalidatePath("/admin", "layout");
  return { success: "Mentve." };
}

export async function deleteTimeEntry(entryId: string): Promise<TimeActionState> {
  const auth = await authorizeEntry(entryId);
  if ("error" in auth) return { error: auth.error };
  const { error } = await auth.adminSupabase.from("task_time_entries").delete().eq("id", entryId);
  if (error) {
    console.error("Time entry delete failed", error);
    return { error: "Nem sikerült törölni a bejegyzést." };
  }
  revalidatePath("/admin", "layout");
  return {};
}
