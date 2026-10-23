"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

// Az értesítések az adatokból számolódnak, az archiválás állapotát az activity_logs őrzi (notification_archived, metadata.notificationKey).
// A szervezetet a kulcsból szerveroldalon oldjuk fel, a kliens nem adhatja meg.
async function resolveOrganizationId(adminSupabase: NonNullable<ReturnType<typeof createAdminClient>>, key: string) {
  const [kind, id] = key.split(":");
  if (kind === "support" && id) {
    const { data } = await adminSupabase.from("support_tickets").select("organization_id").eq("id", id).maybeSingle();
    return (data?.organization_id as string | undefined) ?? null;
  }
  if (kind === "project" && id) {
    const { data } = await adminSupabase.from("projects").select("organization_id").eq("id", id).maybeSingle();
    return (data?.organization_id as string | undefined) ?? null;
  }
  return null;
}

// mode: archive | restore | delete. A "törölt" értesítés a nézetekből végleg eltűnik (notification_deleted), mert az értesítések az adatokból számolódnak, így magát nem lehet kitörölni.
export async function setNotificationArchived(formData: FormData) {
  const keys = [...new Set(formData.getAll("notificationKey").map((value) => String(value).trim()).filter((key) => key && key.length <= 300))].slice(0, 200);
  const mode = formData.get("mode") ?? (formData.get("archive") === "1" ? "archive" : "restore");
  if (!keys.length || (mode !== "archive" && mode !== "restore" && mode !== "delete")) return;

  const access = await getCurrentAdminAccess();
  if (!access.user || !access.role) return;
  const adminSupabase = createAdminClient();
  if (!adminSupabase) return;

  for (const key of keys) {
    if (mode === "archive") {
      const organizationId = await resolveOrganizationId(adminSupabase, key);
      if (!organizationId) continue;
      const { data: existing } = await adminSupabase.from("activity_logs").select("id").in("event_type", ["notification_archived", "notification_deleted"]).filter("metadata->>notificationKey", "eq", key).limit(1);
      if (existing?.length) continue;
      const { error } = await adminSupabase.from("activity_logs").insert({
        actor_role: "admin",
        actor_user_id: access.user.id,
        event_type: "notification_archived",
        metadata: { notificationKey: key },
        organization_id: organizationId,
        title: "Értesítés archiválva",
      });
      if (error) console.error("Notification archive failed", error);
    } else if (mode === "restore") {
      const { error } = await adminSupabase.from("activity_logs").delete().eq("event_type", "notification_archived").filter("metadata->>notificationKey", "eq", key);
      if (error) console.error("Notification restore failed", error);
    } else {
      // csak archivált értesítés törölhető
      const { error } = await adminSupabase.from("activity_logs").update({ event_type: "notification_deleted", title: "Értesítés törölve" }).eq("event_type", "notification_archived").filter("metadata->>notificationKey", "eq", key);
      if (error) console.error("Notification delete failed", error);
    }
  }
  revalidatePath("/admin/notifications");
}
