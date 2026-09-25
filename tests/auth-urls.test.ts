import { test } from "node:test";
import assert from "node:assert/strict";
import { getAuthRequestUrl, getSafeAuthRedirect } from "../lib/auth-urls";

test("production auth uses the configured origin and preserves token parameters", () => {
  const previous = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://portal.convertedweb.com" });
    const url = getAuthRequestUrl(new Request("http://0.0.0.0:3000/auth/confirm?token_hash=test"));
    assert.equal(url.href, "https://portal.convertedweb.com/auth/confirm?token_hash=test");
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal(getAuthRequestUrl(new Request("http://localhost:3000/auth/callback")).origin, "http://localhost:3000");
  } finally {
    process.env = previous;
  }
});

test("auth redirects allow same-origin paths and reject external targets", () => {
  const base = new URL("https://portal.convertedweb.com/auth/confirm");
  for (const value of ["//example.com", "/\\example.com", "https://example.com", "javascript:alert(1)", null]) {
    assert.equal(getSafeAuthRedirect(base, value).href, "https://portal.convertedweb.com/portal");
  }
  assert.equal(getSafeAuthRedirect(base, "/portal/projects?tab=active").href, "https://portal.convertedweb.com/portal/projects?tab=active");
});
