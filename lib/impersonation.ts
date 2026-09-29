import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const IMPERSONATION_COOKIE = "portal-impersonation";

export type ActiveImpersonation = {
  actorEmail: string;
  actorName: string;
};

export async function getActiveImpersonation(): Promise<ActiveImpersonation | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!sessionId) return null;

  const [supabase, adminSupabase] = await Promise.all([createClient(), Promise.resolve(createAdminClient())]);
  if (!adminSupabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await adminSupabase
    .from("impersonation_sessions")
    .select("actor_user_id, target_user_id, consumed_at")
    .eq("id", sessionId)
    .not("consumed_at", "is", null)
    .maybeSingle();

  if (!session || session.target_user_id !== user.id) return null;

  const { data: actorResult } = await adminSupabase.auth.admin.getUserById(session.actor_user_id);
  const actor = actorResult.user;
  if (!actor) return null;

  return {
    actorEmail: actor.email ?? "Nincs e-mail",
    actorName: actor.user_metadata?.full_name
      ?? actor.user_metadata?.name
      ?? actor.email?.split("@")[0]
      ?? "Superadmin",
  };
}
