import assert from "node:assert/strict";
import test from "node:test";
import { aggregateTelnyxRecords } from "../lib/telnyx";

test("a költség és a számlázott másodperc hónaponként a saját számra összegződik", () => {
  const months = aggregateTelnyxRecords([
    { billed_sec: 60, cld: "+36 21 123 4567", cost: "0.02", currency: "USD", direction: "inbound", started_at: "2026-09-10T10:00:00Z" },
    { billed_sec: 90, cli: "+3621 1234567", cost: 0.03, direction: "outbound", started_at: "2026-09-12T10:00:00Z" },
    { billed_sec: 30, cld: "+36211234567", cost: "0.01", direction: "inbound", started_at: "2026-09-30T23:30:00Z" },
    { billed_sec: 30, cld: "+3620999999", cost: "0.5", direction: "inbound", started_at: "2026-09-10T10:00:00Z" },
  ], ["+36211234567"]);

  const sept = months.get("2026-09")?.get("36211234567");
  assert.equal(sept?.billedSecs, 150);
  assert.equal(sept?.calls, 3 - 1);
  assert.ok(Math.abs((sept?.cost ?? 0) - 0.05) < 1e-9);
  // 2026-09-30 23:30 UTC budapesti idő szerint már október.
  assert.equal(months.get("2026-10")?.get("36211234567")?.calls, 1);
  assert.equal(months.size, 2);
});

test("a Telnyx hívásokat csak a projekt indítása után számoljuk; indítás nélkül a szám nem számít", () => {
  const records = [
    { billed_sec: 60, cld: "+36211234567", cost: 0.02, direction: "inbound", started_at: "2026-09-01T10:00:00Z" },
    { billed_sec: 60, cld: "+36211234567", cost: 0.02, direction: "inbound", started_at: "2026-09-20T10:00:00Z" },
    { billed_sec: 60, cld: "+36212222222", cost: 0.02, direction: "inbound", started_at: "2026-09-20T10:00:00Z" },
  ];
  const months = aggregateTelnyxRecords(records, [
    { number: "+36211234567", since: "2026-09-10T00:00:00Z" },
    { number: "+36212222222", since: null },
  ]);
  const sept = months.get("2026-09");
  assert.equal(sept?.get("36211234567")?.calls, 1);
  assert.equal(sept?.get("36212222222"), undefined);
});

