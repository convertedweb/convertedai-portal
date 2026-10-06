import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeWebsiteUrl } from "../lib/lead-sources";

test("website URLs are normalized to scheme, host and path", () => {
  assert.equal(normalizeWebsiteUrl("https://Pelda.hu/Kapcsolat/?utm_source=x#form"), "https://pelda.hu/kapcsolat");
  assert.equal(normalizeWebsiteUrl("pelda.hu"), "https://pelda.hu");
  assert.equal(normalizeWebsiteUrl("  http://www.pelda.hu/  "), "http://www.pelda.hu");
  assert.equal(normalizeWebsiteUrl("https://pelda.hu:8443/a//"), "https://pelda.hu:8443/a");
});

test("invalid or unsafe website URLs are rejected", () => {
  assert.equal(normalizeWebsiteUrl(""), null);
  assert.equal(normalizeWebsiteUrl("javascript:alert(1)"), null);
  assert.equal(normalizeWebsiteUrl("ftp://pelda.hu"), null);
  assert.equal(normalizeWebsiteUrl("https://user:pass@pelda.hu"), null);
  assert.equal(normalizeWebsiteUrl("localhost"), null);
  assert.equal(normalizeWebsiteUrl(`https://pelda.hu/${"a".repeat(600)}`), null);
});
