import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateUsageCostHuf, getUsageMonthKey, summarizeMonthlyUsage } from "../lib/usage";

test("monthly usage groups calls in Budapest time and preserves exact seconds", () => {
  const marchEndUtc = Date.parse("2026-03-31T22:30:00Z") / 1000;
  assert.equal(getUsageMonthKey(marchEndUtc), "2026-04");

  const summary = summarizeMonthlyUsage([
    { callDurationSecs: 90, startTimeUnix: marchEndUtc },
    { callDurationSecs: 30, startTimeUnix: marchEndUtc + 60 },
    { callDurationSecs: 60, startTimeUnix: null },
    { callDurationSecs: null, startTimeUnix: marchEndUtc },
    { callDurationSecs: -1, startTimeUnix: marchEndUtc },
  ], "2026-04");

  assert.deepEqual(summary.monthItems, [{ key: "2026-04", conversationCount: 2, seconds: 120 }]);
  assert.equal(summary.currentMonthSeconds, 120);
  assert.equal(summary.undatedSeconds, 60);
  assert.equal(summary.totalSeconds, 180);
  assert.equal(summary.totalConversationCount, 3);
});

test("cost uses fractional minutes and distinguishes unset from zero rate", () => {
  assert.equal(calculateUsageCostHuf(90, 120), 180);
  assert.equal(calculateUsageCostHuf(75, 10.5), 13.13);
  assert.equal(calculateUsageCostHuf(120, 0), 0);
  assert.equal(calculateUsageCostHuf(120, null), null);
});

test("current month appears even without calls", () => {
  const summary = summarizeMonthlyUsage([], "2026-10");
  assert.deepEqual(summary.monthItems, [{ key: "2026-10", conversationCount: 0, seconds: 0 }]);
});
