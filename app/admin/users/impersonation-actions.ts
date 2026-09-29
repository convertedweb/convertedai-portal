"use server";

import { getCurrentAdminAccess } from "@/lib/admin-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const IMPERSONATION_LIFETIME_MINUTES = 10;

export type ImpersonationActionState = {
  error?: string;
  expiresAt?: string;
  link?: string;
};

function requiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
}

export async function createImpersonationLink(
  _previousState: ImpersonationActionState,
  formData: FormData,
): Promise<ImpersonationActionState> {
  const targetUserId = requiredText(formData.get("targetUserId"));
  if (!targetUserId) return { error: "Hiányzik a kiválasztott felhasználó." };

  const access = await getCurrentAdminAccess();
  if (!access.user) return { error: "A művelethez újra be kell jelentkezned." };
  if (access.role !== "superadmin") return { error: "Másik fiókba csak superadmin léphet be." };
  if (access.user.id === targetUserId) return { error: "A saját fiókodhoz nem készíthető ilyen belépési link." };

  const adminSupabase = createAdminClient();
  if (!adminSupabase) return { error: "A szerveroldali Supabase kapcsolat nincs beállítva." };

  const [targetResult, superadminResult, adminRoleResult, memberResult] = await Promise.all([
    adminSupabase.auth.admin.getUserById(targetUserId),
    adminSupabase.from("super_admins").select("user_id").eq("user_id", targetUserId).limit(1),
    adminSupabase.from("admin_roles").select("role").eq("user_id", targetUserId).limit(1),
    adminSupabase.from("org_members").select("organization_id, role").eq("user_id", targetUserId).limit(1),
  ]);

  const targetUser = targetResult.data.user;
  if (targetResult.error || !targetUser?.email) return { error: "A felhasználó nem található vagy nincs e-mail-címe." };
  if (superadminResult.data?.length || adminRoleResult.data?.some((row) => row.role === "superadmin")) {
    return { error: "Superadmin fiók nem személyesíthető meg." };
  }

  const isAdmin = adminRoleResult.data?.some((row) => row.role === "admin") ?? false;
  const isClient = Boolean(memberResult.data?.length);
  if (!isAdmin && !isClient) return { error: "A felhasználóhoz nincs aktív admin- vagy ügyfélportál-hozzáférés rendelve." };

  const targetRole = isAdmin ? "admin" : "client";
  const redirectPath = isAdmin ? "/admin" : "/portal";
  const { data: generatedLink, error: generateError } = await adminSupabase.auth.admin.generateLink({
    email: targetUser.email,
    options: { redirectTo: `${getSiteUrl()}${redirectPath}` },
    type: "magiclink",
  });

  if (generateError || !generatedLink.properties?.hashed_token) {
    console.error("Impersonation magic link generation failed", generateError);
    return { error: "Nem sikerült létrehozni az egyszer használatos belépési linket." };
  }

  const expiresAt = new Date(Date.now() + IMPERSONATION_LIFETIME_MINUTES * 60_000).toISOString();
  const { data: session, error: sessionError } = await adminSupabase
    .from("impersonation_sessions")
    .insert({
      actor_user_id: access.user.id,
      expires_at: expiresAt,
      redirect_path: redirectPath,
      target_email: targetUser.email,
      target_role: targetRole,
      target_user_id: targetUser.id,
      token_hash: generatedLink.properties.hashed_token,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("Impersonation session insert failed", sessionError);
    return { error: "A belépési linket nem sikerült biztonságosan eltárolni." };
  }

  return {
    expiresAt,
    link: `${getSiteUrl()}/auth/impersonate/${session.id}`,
  };
}
