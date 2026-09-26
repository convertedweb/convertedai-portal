import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/auth/confirm&")) {
    const correctedUrl = request.nextUrl.clone();
    const [pathname, ...rawParameters] = correctedUrl.pathname.split("&");

    correctedUrl.pathname = pathname;
    for (const rawParameter of rawParameters) {
      const separatorIndex = rawParameter.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = decodeURIComponent(rawParameter.slice(0, separatorIndex));
      const value = decodeURIComponent(rawParameter.slice(separatorIndex + 1));
      correctedUrl.searchParams.set(key, value);
    }

    return NextResponse.redirect(correctedUrl);
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) return;
  return updateSession(request);
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/auth/:path*"],
};
