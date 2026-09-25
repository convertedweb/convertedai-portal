export function getAuthRequestUrl(request: Request) {
  const url = new URL(request.url);
  // Standalone Next.js uses the internal container origin behind a reverse proxy.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SITE_URL) {
    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL);
    url.protocol = site.protocol;
    url.host = site.host;
    url.port = site.port;
  }
  return url;
}

export function getSafeAuthRedirect(base: URL, value: string | null) {
  if (value) {
    try {
      const target = new URL(value, base.origin);
      if (target.origin === base.origin) return target;
    } catch {
      // Invalid targets return to the portal.
    }
  }
  return new URL("/portal", base.origin);
}
