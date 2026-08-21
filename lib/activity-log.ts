import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type LogCustomerActivityInput = {
  description?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  projectId?: string | null;
  supabase: SupabaseServerClient;
  title: string;
};

export async function logCustomerActivity({
  description,
  eventType,
  metadata = {},
  organizationId,
  projectId,
  supabase,
  title,
}: LogCustomerActivityInput) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const { error } = await supabase.from("activity_logs").insert({
      actor_role: "client",
      actor_user_id: user.id,
      description: description || null,
      event_type: eventType,
      metadata,
      organization_id: organizationId,
      project_id: projectId ?? null,
      title,
    });

    if (error) console.error("Activity log insert failed", error);
  } catch (error) {
    console.error("Activity log failed", error);
  }
}

type LogAdminActivityInput = {
  actorUserId: string;
  description?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  organizationId: string;
  projectId?: string | null;
  title: string;
};

export async function logAdminActivity({
  actorUserId,
  description,
  eventType,
  metadata = {},
  organizationId,
  projectId,
  title,
}: LogAdminActivityInput) {
  try {
    const adminSupabase = createAdminClient();
    if (!adminSupabase) return;

    const { error } = await adminSupabase.from("activity_logs").insert({
      actor_role: "admin",
      actor_user_id: actorUserId,
      description: description || null,
      event_type: eventType,
      metadata,
      organization_id: organizationId,
      project_id: projectId ?? null,
      title,
    });

    if (error) console.error("Admin activity log insert failed", error);
  } catch (error) {
    console.error("Admin activity log failed", error);
  }
}
