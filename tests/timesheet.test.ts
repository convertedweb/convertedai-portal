import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, addMonths, splitByDay, isWeekend, monthRangeOf, budapestDateTime, budapestDayKey, budapestTime, formatDuration, weekStartOf } from "../lib/timesheet";

test("week starts on Monday and rolls over month boundaries", () => {
  assert.equal(weekStartOf("2026-10-10"), "2026-10-05");
  assert.equal(weekStartOf("2026-10-05"), "2026-10-05");
  assert.equal(weekStartOf("2026-10-11"), "2026-10-05");
  assert.equal(weekStartOf("2026-11-01"), "2026-10-26");
  assert.equal(weekStartOf("nonsense", "2026-10-10"), "2026-10-05");
  assert.equal(addDays("2026-02-27", 3), "2026-03-02");
});

test("days are bucketed in Budapest time", () => {
  assert.equal(budapestDayKey(new Date("2026-10-09T22:30:00Z")), "2026-10-10");
  assert.equal(budapestDayKey(new Date("2026-10-09T21:30:00Z")), "2026-10-09");
});

test("durations are formatted compactly", () => {
  assert.equal(formatDuration(0), "–");
  assert.equal(formatDuration(0, "0h"), "0h");
  assert.equal(formatDuration(82 * 60000), "1h 22m");
  assert.equal(formatDuration(30 * 60000), "30m");
  assert.equal(formatDuration(120 * 60000), "2h");
});

test("Budapest local time converts to the right instant across DST", () => {
  assert.equal(budapestDateTime("2026-10-10", "12:00")?.toISOString(), "2026-10-10T10:00:00.000Z");
  assert.equal(budapestDateTime("2026-12-10", "12:00")?.toISOString(), "2026-12-10T11:00:00.000Z");
  assert.equal(budapestDateTime("2026-03-29", "12:00")?.toISOString(), "2026-03-29T10:00:00.000Z");
  assert.equal(budapestDateTime("2026-02-31", "12:00"), null);
  assert.equal(budapestDateTime("2026-10-10", "24:00"), null);
  assert.equal(budapestTime(new Date("2026-10-10T10:05:00Z")), "12:05");
});

test("month ranges and month shifts handle year ends and leap years", () => {
  assert.deepEqual(monthRangeOf("2026-10-10"), { end: "2026-10-31", start: "2026-10-01" });
  assert.deepEqual(monthRangeOf("2028-02-15"), { end: "2028-02-29", start: "2028-02-01" });
  assert.equal(addMonths("2026-12-01", 1), "2027-01-01");
  assert.equal(addMonths("2026-01-01", -1), "2025-12-01");
  assert.equal(isWeekend("2026-10-10"), true);
  assert.equal(isWeekend("2026-10-12"), false);
});

test("entries crossing midnight are split by Budapest day", () => {
  const parts = splitByDay(new Date("2026-10-10T20:30:00Z"), new Date("2026-10-11T00:30:00Z")); // 22:30 – 02:30 helyi
  assert.deepEqual(parts.map((part) => [part.day, part.ms / 60000]), [["2026-10-10", 90], ["2026-10-11", 150]]);
  assert.equal(splitByDay(new Date("2026-10-10T08:00:00Z"), new Date("2026-10-10T09:00:00Z")).length, 1);
  assert.equal(splitByDay(new Date("2026-10-10T08:00:00Z"), new Date("2026-10-10T08:00:00Z")).length, 0);
  // három nap, benne az őszi óraátállítás napja (2026-10-25 25 órás)
  const long = splitByDay(new Date("2026-10-24T21:00:00Z"), new Date("2026-10-26T22:30:00Z"));
  assert.equal(long.reduce((sum, part) => sum + part.ms, 0), 49.5 * 3600000);
  assert.equal(long.length, 3);
});
