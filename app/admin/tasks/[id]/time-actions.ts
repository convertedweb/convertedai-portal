"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type TimeActionState = { error?: string };

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
  revalidatePath(`/admin/tasks/${taskId}`);
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
  revalidatePath(`/admin/tasks/${taskId}`);
  return {};
}
