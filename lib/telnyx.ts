export type TelnyxNumberUsage = {
  billedSecs: number;
  calls: number;
  cost: number;
  currency: string;
};

type TelnyxDetailRecord = {
  billed_sec?: number | string | null;
  call_sec?: number | string | null;
  cld?: string | null;
  cli?: string | null;
  cost?: number | string | null;
  currency?: string | null;
  direction?: string | null;
  started_at?: string | null;
};

const maxPages = 100;

export function normalizePhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

const budapestMonth = new Intl.DateTimeFormat("en-CA", { month: "2-digit", timeZone: "Europe/Budapest", year: "numeric" });

export function monthKeyOf(iso: string) {
  const parts = Object.fromEntries(budapestMonth.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
}

// Telnyx-percdíj: hívásonként a számlázott másodpercek, nem a beszélgetés hossza.
// Eredmény: hónap (YYYY-MM, budapesti idő) -> saját szám (csak számjegyek) -> összesítés.
// A szám lehet sima szöveg (szűrés nélkül) vagy { number, since }: ilyenkor csak a since (indítás ideje) utáni hívások számítanak;
// since nélkül (null) a szám hívásait nem számoljuk.
export type TelnyxNumberInput = string | { number: string; since: string | null };

export function aggregateTelnyxRecords(records: TelnyxDetailRecord[], numbers: TelnyxNumberInput[]) {
  const sinceByNumber = new Map<string, number | null>();
  for (const input of numbers) {
    const number = normalizePhone(typeof input === "string" ? input : input.number);
    if (!number) continue;
    const since = typeof input === "string" ? -Infinity : input.since ? Date.parse(input.since) : null;
    sinceByNumber.set(number, since !== null && Number.isNaN(since) ? null : since);
  }
  const months = new Map<string, Map<string, TelnyxNumberUsage>>();

  for (const record of records) {
    if (!record.started_at) continue;
    // Bejövő hívásnál a hívott (cld), kimenőnél a hívó (cli) szám a miénk.
    const own = normalizePhone(record.direction === "outbound" ? record.cli : record.cld);
    if (!sinceByNumber.has(own)) continue;
    const since = sinceByNumber.get(own);
    if (since === null || since === undefined || Date.parse(record.started_at) < since) continue;

    const month = monthKeyOf(record.started_at);
    const usage = months.get(month) ?? new Map<string, TelnyxNumberUsage>();
    const current = usage.get(own) ?? { billedSecs: 0, calls: 0, cost: 0, currency: record.currency ?? "USD" };
    current.billedSecs += Number(record.billed_sec ?? record.call_sec ?? 0) || 0;
    current.cost += Number(record.cost ?? 0) || 0;
    current.calls += 1;
    usage.set(own, current);
    months.set(month, usage);
  }

  return months;
}

export async function getTelnyxUsageByMonth(numbers: TelnyxNumberInput[]) {
  const empty = new Map<string, Map<string, TelnyxNumberUsage>>();
  const apiKey = process.env.TELNYX_API_KEY;
  if (!apiKey) return { months: empty, error: "Hiányzik a TELNYX_API_KEY környezeti változó." };

  const recordType = process.env.TELNYX_RECORD_TYPE || "sip-trunking";
  const records: TelnyxDetailRecord[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL("https://api.telnyx.com/v2/detail_records");
    url.searchParams.set("filter[record_type]", recordType);
    // shortcut: a Telnyx fiók 2026 közepén indult; korábbi hívásokhoz a dátumot előbbre kell tenni.
    url.searchParams.set("filter[started_at][gte]", "2026-01-01");
    url.searchParams.set("page[number]", String(page));
    url.searchParams.set("page[size]", "50");

    const response = await fetch(url, { cache: "no-store", headers: { Authorization: `Bearer ${apiKey}` } });
    if (!response.ok) return { months: empty, error: `Telnyx lekérés sikertelen: ${response.status} ${response.statusText}` };

    let payload: { data?: TelnyxDetailRecord[]; meta?: { total_pages?: number } };
    try {
      payload = await response.json();
    } catch {
      return { months: empty, error: "A Telnyx válasz nem értelmezhető." };
    }

    records.push(...(payload.data ?? []));
    if (page >= (payload.meta?.total_pages ?? 1)) break;
    if (page === maxPages) return { months: empty, error: "Túl sok Telnyx rekord, az összesítés nem teljes." };
  }

  return { months: aggregateTelnyxRecords(records, numbers), error: null };
}
