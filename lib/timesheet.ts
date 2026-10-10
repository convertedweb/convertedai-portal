export const timesheetTimeZone = "Europe/Budapest";

const dayFormatter = new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "2-digit", timeZone: timesheetTimeZone, year: "numeric" });

// "YYYY-MM-DD" naptári nap budapesti időzónában.
export function budapestDayKey(date: Date) {
  return dayFormatter.format(date);
}

export function addDays(dayKey: string, days: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

// A megadott nap hétfője ("YYYY-MM-DD"); érvénytelen bemenetnél a mai hét hétfője.
export function weekStartOf(dayKey: string | undefined, today = budapestDayKey(new Date())) {
  const valid = dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey) && !Number.isNaN(Date.parse(dayKey)) ? dayKey : today;
  const weekday = new Date(`${valid}T00:00:00Z`).getUTCDay();
  return addDays(valid, -((weekday + 6) % 7));
}

export function formatDuration(ms: number, zero = "–") {
  const minutes = Math.round(ms / 60000);
  if (minutes <= 0) return zero;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", { day: "2-digit", hour: "2-digit", hourCycle: "h23", minute: "2-digit", month: "2-digit", second: "2-digit", timeZone: timesheetTimeZone, year: "numeric" });

function zoneOffsetMs(date: Date) {
  const part = Object.fromEntries(partsFormatter.formatToParts(date).map((item) => [item.type, Number(item.value)]));
  return Date.UTC(part.year, part.month - 1, part.day, part.hour, part.minute, part.second) - date.getTime();
}

// Budapesti "YYYY-MM-DD" + "HH:MM" → pontos időpont; érvénytelen bemenetnél null.
export function budapestDateTime(dayKey: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year, month, day] = dayKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  if (new Date(asUtc).getUTCDate() !== day) return null;
  // Kétlépéses közelítés, hogy a nyári/téli időszámítás váltása körül is pontos legyen.
  const first = new Date(asUtc - zoneOffsetMs(new Date(asUtc)));
  return new Date(asUtc - zoneOffsetMs(first));
}

export function budapestTime(date: Date) {
  return new Intl.DateTimeFormat("hu-HU", { hour: "2-digit", hourCycle: "h23", minute: "2-digit", timeZone: timesheetTimeZone }).format(date);
}

export function isWeekend(dayKey: string) {
  const weekday = new Date(`${dayKey}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}

// A megadott nap hónapjának első és utolsó napja; érvénytelen bemenetnél a mai hónap.
export function monthRangeOf(dayKey: string | undefined, today = budapestDayKey(new Date())) {
  const valid = dayKey && /^\d{4}-\d{2}-\d{2}$/.test(dayKey) && !Number.isNaN(Date.parse(dayKey)) ? dayKey : today;
  const [year, month] = valid.split("-").map(Number);
  return { end: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10), start: `${valid.slice(0, 7)}-01` };
}

export function addMonths(monthStart: string, months: number) {
  const [year, month] = monthStart.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 10);
}

export type DaySegment = { day: string; from: Date; ms: number; to: Date };

// Az intervallumot budapesti naptári napokra bontja (éjfélkor vág).
export function splitByDay(start: Date, end: Date): DaySegment[] {
  const segments: DaySegment[] = [];
  let cursor = start;
  while (cursor < end) {
    const day = budapestDayKey(cursor);
    const midnight = budapestDateTime(addDays(day, 1), "00:00");
    const to = midnight && midnight < end ? midnight : end;
    segments.push({ day, from: cursor, ms: to.getTime() - cursor.getTime(), to });
    cursor = to;
  }
  return segments;
}
