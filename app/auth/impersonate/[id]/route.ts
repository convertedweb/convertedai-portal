import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthRequestUrl } from "@/lib/auth-urls";
import { IMPERSONATION_COOKIE } from "@/lib/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";

type ImpersonationSession = {
  actor_user_id: string;
  redirect_path: "/admin" | "/portal";
  target_user_id: string;
  token_hash: string;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestUrl = getAuthRequestUrl(request);
  const { id } = await context.params;
  const adminSupabase = createAdminClient();

  if (!adminSupabase || !id) return redirectToLogin(requestUrl.origin, "A belépési link nem érhető el.");

  const { data: pendingSession, error: pendingError } = await adminSupabase
    .from("impersonation_sessions")
    .select("actor_user_id, target_user_id, token_hash, redirect_path")
    .eq("id", id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<ImpersonationSession>();

  if (pendingError || !pendingSession) {
    return redirectToLogin(requestUrl.origin, "A belépési link lejárt vagy már felhasználták.");
  }

  const [actorRole, actorLegacyRole, targetRole, targetLegacyRole] = await Promise.all([
    adminSupabase.from("admin_roles").select("role").eq("user_id", pendingSession.actor_user_id).eq("role", "superadmin").limit(1),
    adminSupabase.from("super_admins").select("user_id").eq("user_id", pendingSession.actor_user_id).limit(1),
    adminSupabase.from("admin_roles").select("role").eq("user_id", pendingSession.target_user_id).eq("role", "superadmin").limit(1),
    adminSupabase.from("super_admins").select("user_id").eq("user_id", pendingSession.target_user_id).limit(1),
  ]);

  if (!actorRole.data?.length && !actorLegacyRole.data?.length) {
    return redirectToLogin(requestUrl.origin, "A linket létrehozó felhasználó már nem superadmin.");
  }
  if (targetRole.data?.length || targetLegacyRole.data?.length) {
    return redirectToLogin(requestUrl.origin, "Superadmin fiók nem személyesíthető meg.");
  }

  const consumedAt = new Date().toISOString();
  const { data: consumedSession, error: consumeError } = await adminSupabase
    .from("impersonation_sessions")
    .update({ consumed_at: consumedAt })
    .eq("id", id)
    .is("consumed_at", null)
    .gt("expires_at", consumedAt)
    .select("token_hash, redirect_path")
    .maybeSingle<Pick<ImpersonationSession, "redirect_path" | "token_hash">>();

  if (consumeError || !consumedSession) {
    return redirectToLogin(requestUrl.origin, "A belépési link lejárt vagy már felhasználták.");
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(consumedSession.redirect_path, requestUrl.origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: consumedSession.token_hash,
    type: "magiclink",
  });

  if (verifyError) {
    console.error("Impersonation OTP verification failed", verifyError);
    return redirectToLogin(requestUrl.origin, "A belépési linket nem sikerült érvényesíteni.");
  }

  response.cookies.set(IMPERSONATION_COOKIE, id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function redirectToLogin(origin: string, error: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}
