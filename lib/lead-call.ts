export const leadCallEventStatuses = [
  "received",
  "calling",
  "retry_pending",
  "completed",
  "failed",
  "skipped",
  "do_not_call",
] as const;

export type LeadCallEventStatus = (typeof leadCallEventStatuses)[number];

// Ezekben az állapotokban a lead hívása nem indítható újra (stop-ellenőrzés).
export const leadCallTerminalStatuses: readonly LeadCallEventStatus[] = [
  "completed",
  "failed",
  "skipped",
  "do_not_call",
];

export const maxLeadCallAttempts = 20;

const externalIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

// A Meta űrlapazonosító gyakran "f:" előtaggal érkezik; a portál az előtag nélküli alakot tárolja.
export function normalizeMetaExternalId(value: string | null | undefined) {
  const trimmed = (value ?? "").trim().replace(/^f:/i, "");
  return externalIdPattern.test(trimmed) ? trimmed : null;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isLeadIdHash(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function isLeadCallEventStatus(value: unknown): value is LeadCallEventStatus {
  return typeof value === "string" && (leadCallEventStatuses as readonly string[]).includes(value);
}

export function isStopStatus(status: LeadCallEventStatus) {
  return leadCallTerminalStatuses.includes(status);
}

export const weekdayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const weekdayLabels: Record<(typeof weekdayKeys)[number], string> = {
  mon: "Hétfő",
  tue: "Kedd",
  wed: "Szerda",
  thu: "Csütörtök",
  fri: "Péntek",
  sat: "Szombat",
  sun: "Vasárnap",
};

export type BusinessHours = {
  days: Record<(typeof weekdayKeys)[number], { end: string; start: string }[]>;
  timezone: string;
};

export const defaultBusinessHours: BusinessHours = {
  days: {
    mon: [{ end: "17:00", start: "09:00" }],
    tue: [{ end: "17:00", start: "09:00" }],
    wed: [{ end: "17:00", start: "09:00" }],
    thu: [{ end: "17:00", start: "09:00" }],
    fri: [{ end: "17:00", start: "09:00" }],
    sat: [],
    sun: [],
  },
  timezone: "Europe/Budapest",
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// Szerveroldali normalizálás: ismeretlen vagy hibás szerkezetnél null (a hívó az alapértelmezést használja).
export function normalizeBusinessHours(value: unknown): BusinessHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as { days?: unknown; timezone?: unknown };
  if (typeof source.timezone !== "string" || !isValidTimeZone(source.timezone)) return null;
  if (!source.days || typeof source.days !== "object" || Array.isArray(source.days)) return null;

  const days = {} as BusinessHours["days"];
  for (const key of weekdayKeys) {
    const intervals = (source.days as Record<string, unknown>)[key] ?? [];
    if (!Array.isArray(intervals)) return null;
    const normalized: { end: string; start: string }[] = [];
    for (const interval of intervals) {
      if (!interval || typeof interval !== "object") return null;
      const { start, end } = interval as { end?: unknown; start?: unknown };
      if (typeof start !== "string" || typeof end !== "string") return null;
      if (!timePattern.test(start) || !timePattern.test(end) || start >= end) return null;
      normalized.push({ end, start });
    }
    days[key] = normalized;
  }
  return { days, timezone: source.timezone };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeNotifyEmails(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const email = item.trim().toLowerCase();
    if (email.length <= 254 && emailPattern.test(email)) seen.add(email);
  }
  return [...seen].slice(0, 10);
}

// Űrlapmező (vesszővel, pontosvesszővel vagy sortöréssel elválasztott címek) feldolgozása; a hibás címeket külön adja vissza.
export function parseNotifyEmailsInput(text: string) {
  const items = text.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
  const emails = normalizeNotifyEmails(items);
  const invalid = items.filter((item) => !normalizeNotifyEmails([item]).length);
  return { emails, invalid };
}

// A projekt Telefon fülén megadott számhoz tartozó ElevenLabs phone_number_id; a számok összevetése csak a számjegyekre épül.
export function matchElevenLabsPhoneNumberId(phoneNumbers: { phone_number?: string; phone_number_id?: string }[], phoneNumber: string) {
  const digits = (value: string) => value.replace(/\D/g, "");
  const wanted = digits(phoneNumber);
  if (!wanted) return null;
  return phoneNumbers.find((item) => item.phone_number && item.phone_number_id && digits(item.phone_number) === wanted)?.phone_number_id ?? null;
}
