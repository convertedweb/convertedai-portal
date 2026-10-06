export const leadSourceTypes = ["meta_form", "website_form"] as const;

export type LeadSourceType = (typeof leadSourceTypes)[number];

export const leadSourceTypeLabels: Record<LeadSourceType, string> = {
  meta_form: "Meta lead űrlap",
  website_form: "Weboldal űrlap",
};

// A weboldal-űrlap azonosítója a normalizált oldal-URL: séma + host + útvonal, query, hash és záró perjel nélkül.
export function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname.includes(".") || /\s/.test(url.hostname)) return null;

  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`.toLowerCase();
}
