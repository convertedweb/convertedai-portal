import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const callbackError = requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  const requestedNext = requestUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/") ? requestedNext : "/portal";
  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));

  if (callbackError) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", callbackError);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", requestUrl.origin);
      loginUrl.searchParams.set("next", next);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }

    const resolvedNext = await resolveRedirectAfterLogin(supabase, next);
    response.headers.set("location", new URL(resolvedNext, requestUrl.origin).toString());
  }

  return response;
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
