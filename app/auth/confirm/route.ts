import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthRequestUrl, getSafeAuthRedirect } from "@/lib/auth-urls";

const allowedOtpTypes = new Set(["signup", "invite", "magiclink", "recovery", "email", "email_change"]);

export async function GET(request: Request) {
  const requestUrl = getAuthRequestUrl(request);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextUrl = getSafeAuthRedirect(requestUrl, requestUrl.searchParams.get("redirect_to") ?? requestUrl.searchParams.get("next"));

  if (!tokenHash || !type || !allowedOtpTypes.has(type)) {
    return redirectToLogin(requestUrl.origin, nextUrl.pathname, "A belépési link hiányos vagy hibás.");
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(nextUrl);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    return redirectToLogin(requestUrl.origin, nextUrl.pathname, error.message);
  }

  const resolvedNext = await resolveRedirectAfterLogin(supabase, nextUrl.pathname);
  response.headers.set("location", new URL(resolvedNext, requestUrl.origin).toString());

  return response;
}

function redirectToLogin(origin: string, next: string, error: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("next", next);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}

async function resolveRedirectAfterLogin(supabase: ReturnType<typeof createServerClient>, next: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return next;

  const [{ data: superAdminRows }, { data: adminRoleRows }] = await Promise.all([
    supabase.from("super_admins").select("id").eq("user_id", user.id).limit(1),
    supabase.from("admin_roles").select("role").eq("user_id", user.id).limit(1),
  ]);

  const isSuperAdmin = Boolean(superAdminRows?.length);
  const isInternalAdmin = isSuperAdmin || Boolean(adminRoleRows?.length);
  const superAdminOnlyPaths = ["/admin/users", "/admin/permissions"];

  if (isInternalAdmin && next.startsWith("/portal")) return "/admin";
  if (!isSuperAdmin && superAdminOnlyPaths.some((path) => next === path || next.startsWith(`${path}/`))) return "/admin";

  return next;
}
