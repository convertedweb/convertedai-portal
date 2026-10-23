import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultBusinessHours,
  isLeadIdHash,
  isStopStatus,
  isUuid,
  normalizeBusinessHours,
  normalizeMetaExternalId,
  normalizeNotifyEmails,
} from "../lib/lead-call";
import { checkLeadCallSecret } from "../lib/lead-call-auth";

test("secret check fails closed and compares exactly", () => {
  assert.equal(checkLeadCallSecret("x", undefined), "not_configured");
  assert.equal(checkLeadCallSecret("x", ""), "not_configured");
  assert.equal(checkLeadCallSecret(null, "secret"), "unauthorized");
  assert.equal(checkLeadCallSecret("", "secret"), "unauthorized");
  assert.equal(checkLeadCallSecret("secre", "secret"), "unauthorized");
  assert.equal(checkLeadCallSecret("secret ", "secret"), "unauthorized");
  assert.equal(checkLeadCallSecret("secret", "secret"), "ok");
});

test("Meta external ids drop the f: prefix and reject unsafe values", () => {
  assert.equal(normalizeMetaExternalId("f:2819359878445768"), "2819359878445768");
  assert.equal(normalizeMetaExternalId(" 900000000000001 "), "900000000000001");
  assert.equal(normalizeMetaExternalId(""), null);
  assert.equal(normalizeMetaExternalId(null), null);
  assert.equal(normalizeMetaExternalId("1 or 1=1"), null);
  assert.equal(normalizeMetaExternalId("a".repeat(129)), null);
});

test("identifier validators", () => {
  assert.equal(isLeadIdHash("a".repeat(64)), true);
  assert.equal(isLeadIdHash("A".repeat(64)), false);
  assert.equal(isLeadIdHash("a".repeat(63)), false);
  assert.equal(isUuid("edc7c8e1-1220-4a27-9c13-882683b2ea76"), true);
  assert.equal(isUuid("nem-uuid"), false);
  assert.equal(isUuid(undefined), false);
});

test("terminal statuses stop further calls", () => {
  assert.equal(isStopStatus("completed"), true);
  assert.equal(isStopStatus("do_not_call"), true);
  assert.equal(isStopStatus("calling"), false);
  assert.equal(isStopStatus("retry_pending"), false);
});

test("business hours are validated and normalized", () => {
  assert.deepEqual(normalizeBusinessHours(defaultBusinessHours), defaultBusinessHours);
  assert.equal(normalizeBusinessHours(null), null);
  assert.equal(normalizeBusinessHours([]), null);
  assert.equal(normalizeBusinessHours({ days: {}, timezone: "Nem/Letezik" }), null);
  assert.equal(normalizeBusinessHours({ days: { mon: [{ end: "09:00", start: "17:00" }] }, timezone: "Europe/Budapest" }), null);
  assert.equal(normalizeBusinessHours({ days: { mon: [{ end: "25:00", start: "09:00" }] }, timezone: "Europe/Budapest" }), null);
  const partial = normalizeBusinessHours({ days: { mon: [{ end: "12:00", start: "08:00" }] }, timezone: "Europe/Budapest" });
  assert.deepEqual(partial?.days.mon, [{ end: "12:00", start: "08:00" }]);
  assert.deepEqual(partial?.days.sun, []);
});

test("notify emails are lowercased, deduplicated and capped", () => {
  assert.deepEqual(normalizeNotifyEmails([" A@B.hu ", "a@b.hu", "rossz", 5, "c@d.hu"]), ["a@b.hu", "c@d.hu"]);
  assert.deepEqual(normalizeNotifyEmails("a@b.hu"), []);
  assert.equal(normalizeNotifyEmails(Array.from({ length: 15 }, (_, i) => `u${i}@x.hu`)).length, 10);
});

test("notify email input is split on commas, semicolons and newlines and reports invalid entries", async () => {
  const { parseNotifyEmailsInput } = await import("../lib/lead-call");
  assert.deepEqual(parseNotifyEmailsInput("a@b.hu, c@d.hu;\ne@f.hu"), { emails: ["a@b.hu", "c@d.hu", "e@f.hu"], invalid: [] });
  assert.deepEqual(parseNotifyEmailsInput("a@b.hu rossz"), { emails: ["a@b.hu"], invalid: ["rossz"] });
  assert.deepEqual(parseNotifyEmailsInput(""), { emails: [], invalid: [] });
});

test("ElevenLabs phone number lookup compares digits only", async () => {
  const { matchElevenLabsPhoneNumberId } = await import("../lib/lead-call");
  const list = [{ phone_number: "+36 1 234 5678", phone_number_id: "phnum_a" }, { phone_number: "+3630555014", phone_number_id: "phnum_b" }];
  assert.equal(matchElevenLabsPhoneNumberId(list, "+3612345678"), "phnum_a");
  assert.equal(matchElevenLabsPhoneNumberId(list, "36 30 555 014"), "phnum_b");
  assert.equal(matchElevenLabsPhoneNumberId(list, "+36 70 000 000"), null);
  assert.equal(matchElevenLabsPhoneNumberId(list, ""), null);
});
