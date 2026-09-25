import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthRequestUrl, getSafeAuthRedirect } from "@/lib/auth-urls";

export async function GET(request: Request) {
  const requestUrl = getAuthRequestUrl(request);
  const requestedNext = requestUrl.searchParams.get("next");
  const safeNext = getSafeAuthRedirect(requestUrl, requestedNext);
  const next = safeNext.pathname + safeNext.search;
  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, requestUrl.origin));

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

  await supabase.auth.signOut();
  return response;
}
