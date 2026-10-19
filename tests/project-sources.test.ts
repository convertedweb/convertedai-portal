import { test } from "node:test";
import assert from "node:assert/strict";
import { isDesignProject, isSourceDocumentCategory, isSourceLinkKind, normalizeSourceLinkUrl } from "../lib/project-sources";

test("design source links preserve paths, queries, and fragments", () => {
  assert.equal(
    normalizeSourceLinkUrl("  https://www.figma.com/file/abc/Terv?node-id=12%3A34#details  "),
    "https://www.figma.com/file/abc/Terv?node-id=12%3A34#details",
  );
  assert.equal(normalizeSourceLinkUrl("http://example.com/reference"), "http://example.com/reference");
});

test("design source links reject unsafe or malformed URLs", () => {
  assert.equal(normalizeSourceLinkUrl("javascript:alert(1)"), null);
  assert.equal(normalizeSourceLinkUrl("https://user:pass@example.com"), null);
  assert.equal(normalizeSourceLinkUrl("figma.com/file/abc"), null);
  assert.equal(normalizeSourceLinkUrl(`https://example.com/${"a".repeat(2000)}`), null);
});

test("design source categories stay separate from agent projects", () => {
  assert.equal(isDesignProject("ui_ux_design"), true);
  assert.equal(isDesignProject("website"), true);
  assert.equal(isDesignProject("voice_agent"), false);
  assert.equal(isSourceDocumentCategory("design_source_brand"), true);
  assert.equal(isSourceDocumentCategory("knowledge_base"), false);
  assert.equal(isSourceLinkKind("figma"), true);
  assert.equal(isSourceLinkKind("javascript"), false);
});
