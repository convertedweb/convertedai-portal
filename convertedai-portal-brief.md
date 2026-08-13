# ConvertedAI Portal — Fejlesztői brief (Codex)

**v2 — önhosztolt, nulla előfizetés**

> **Célközönség:** Codex / AI coding agent. Ez a dokumentum a projekt teljes specifikációja.
> **Munkamódszer:** két fázis, fázisonként egy PR. Ne kezdj a 2. fázisba, amíg az 1. nem futtatható és tesztelt.
> **Nyelv:** UI és minden felhasználónak látható szöveg **magyar**. Kód, változónevek, kommentek, commit üzenetek **angol**.
> **Alapelv:** ez egy **vékony megjelenítő réteg**, nem egy második automatizációs motor. Ami automatizálható, az n8n-ben fut.

---

## 1. Kontextus

A ConvertedAI managed service modellben épít és üzemeltet AI telefonos recepciós rendszereket magyar KKV-knak (fogászati rendelők, ügyvédi irodák). Az infrastruktúra (voice AI, telefónia, n8n automatizáció) a szolgáltató saját accountjaiban fut — az ügyfél csak a saját adatait (naptár, email, táblázat) tartja.

Ez az app váltja ki a jelenlegi email + táblázat alapú ügyfélkommunikációt: **egy ügyfélportál + egy minimális admin backoffice**, `ugyfel.convertedweb.com` alatt, a szolgáltató saját arculatával.

Az app **nem** hív voice AI vagy telefóniai API-t, és **nem** üzemelteti az agentet. Amit csinál: onboarding adatgyűjtés, dokumentumtár, riport-megjelenítés, ticketing.

**Fontos üzemeltetési kontextus:** a szolgáltatónak már fut egy **self-hosted n8n** és egy **Postgres** ugyanazon a szerveren. Az app ezek mellé kerül, ugyanarra a gépre, ugyanazzal a backup rutinnal. Nincs semmilyen fizetős SaaS függőség — se Supabase, se Vercel, se Resend.

---

## 2. Tech stack (kötelező)

| Réteg | Technológia |
|---|---|
| Framework | Next.js 15, App Router, TypeScript strict |
| UI | Tailwind CSS + shadcn/ui, `lucide-react` ikonok |
| DB | **Postgres 15+ — a már futó példányon, külön adatbázisban** (`convertedai_portal`) |
| DB réteg | **Drizzle ORM + drizzle-kit** (migrációk, típusok). Ne használj Prismát, ne írj nyers SQL-t az app kódban. |
| Auth | **Auth.js (NextAuth v5) + Drizzle adapter, Email provider (magic link)** |
| Email küldés | `nodemailer` SMTP-n keresztül a meglévő Zoho/Google Workspace fiókkal |
| Form / validáció | `react-hook-form` + `zod` |
| Táblázatok | `@tanstack/react-table` |
| Grafikonok | `recharts` |
| Fájltárolás | **Lemez a szerveren** (`/data/uploads`), Docker volume-ként csatolva |
| Deploy | **Docker Compose** (multi-stage build, `output: "standalone"`), reverse proxy: a meglévő Caddy/Traefik/nginx |
| Tesztelés | Vitest (unit) |

**Ne** vezess be további függőséget engedély nélkül. Ne használj state managert. Ne használj objektum-tárolót (S3/MinIO) — a fájlvolumen ezt nem indokolja.

---

## 3. Architektúra alapelvek

1. **Server Components alapértelmezés.** `"use client"` csak ott, ahol interaktivitás kell (form, modal, filter, feltöltés).
2. **Minden írás Server Action-ön keresztül.** Nincs kliensoldali DB hozzáférés — a kliens sosem beszél a Postgresszel.
3. **Egy fojtópont a tenant-izolációra.** Mivel az adatbázis csak szerveroldalról érhető el, **nem használunk RLS-t**. Helyette **minden** adatelérés ezen a két helperen megy át:

   ```ts
   // lib/auth-guard.ts
   export async function requireSession(): Promise<Session>
   export async function requireOrgAccess(orgId: string): Promise<{ session: Session; role: Role }>
   export async function requirePlatformAdmin(): Promise<Session>
   ```

   **Szabály:** minden Server Action és minden Route Handler első sora e három közül az egyik. Ha egy lekérdezés `org_id`-t érint és nem ment át `requireOrgAccess`-en, az bug. Írj erre a helperre legalább 5 unit tesztet (idegen org, törölt org, hiányzó session, rossz szerep, platform admin bypass).

4. **snake_case** minden DB oszlopnévben és minden JSON API mezőnévben. A Drizzle sémában a TS oldalon camelCase, a DB oldalon snake_case (`casing: 'snake_case'`).
5. **Soft delete** minden ügyfél-adaton (`deleted_at timestamptz`). Semmit ne törölj fizikailag.
6. **Audit log** minden admin írásnál és minden dokumentum-letöltésnél.
7. **Az app nem küld emailt** — kivéve a magic linket. Minden más értesítést az n8n küld (lásd 9. fejezet).

---

## 4. Szerepkörök

| Szerep | Leírás |
|---|---|
| `platform_admin` | Szolgáltatói oldal (1 fő). Minden org minden adatát látja és írja. A `users.is_platform_admin` boolean dönti el. |
| `client_owner` | Ügyfél fő kapcsolattartója. Saját org: minden olvasás + írás. |
| `client_member` | Ügyfél munkatárs (pl. recepciós). Saját org: riport olvasás, ticket nyitás. Onboarding brief-hez és dokumentumokhoz **nincs** hozzáférése. |

A szerep az `org_members.role` oszlopban él.

---

## 5. Adatmodell

Drizzle sémában írd meg (`db/schema.ts`), a migrációkat `drizzle-kit generate`-tel állítsd elő. Az alábbi SQL a **kívánt végállapot** — ezt képezd le Drizzle-re, ne másold be nyersen.

### 5.1 Auth.js táblák

Használd a hivatalos Drizzle adapter sémát: `users`, `accounts`, `sessions`, `verification_token`. A `users` táblát bővítsd:

```sql
-- Auth.js users tábla + saját mezők
alter table users add column full_name text;
alter table users add column phone text;
alter table users add column is_platform_admin boolean not null default false;
alter table users add column created_at timestamptz not null default now();
```

Az `accounts` tábla magic link mellett üres marad — az adapter miatt kell.

### 5.2 Domain táblák

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  industry text,                            -- 'dental' | 'legal' | 'other'
  billing_email text,
  tax_number text,
  address text,
  status text not null default 'onboarding',  -- onboarding | active | paused | churned
  monthly_fee_huf integer,
  notes text,                               -- admin belső jegyzet
  onboarding_completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('client_owner','client_member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  agent_display_name text,                  -- az agent neve, amit a hívó hall
  phone_number text,                        -- a végfelhasználónak látszó szám
  status text not null default 'draft',     -- draft | building | live | paused
  went_live_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table project_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade unique,
  answers jsonb not null default '{}',      -- kulcs -> válasz, zod sémával validálva
  completed_sections text[] not null default '{}',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  category text not null,       -- 'telnyx_regulatory' | 'contract' | 'price_list' | 'other'
  doc_type text,                -- 'company_extract' | 'utility_bill' | 'id_document'
  file_name text not null,      -- eredeti fájlnév, megjelenítéshez
  storage_path text not null,   -- relatív út a /data/uploads-on belül
  mime_type text not null,
  size_bytes integer not null,
  checksum_sha256 text,
  uploaded_by text references users(id),
  review_status text not null default 'pending',  -- pending | accepted | rejected
  review_note text,
  reviewed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Az admin által bekért, még hiányzó dokumentumok (checklist)
create table document_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  doc_type text not null,
  label text not null,          -- "Közüzemi számla a székhely címére"
  help_text text,               -- "Maximum 3 hónapos legyen"
  is_required boolean not null default true,
  fulfilled_by uuid references documents(id),
  created_at timestamptz not null default now()
);

-- Csak nyilvántartás. Az összekötés kézzel, képernyőmegosztáson történik.
create table google_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  connection_type text not null,           -- 'calendar' | 'sheets'
  google_account_email text,
  resource_id text,                        -- calendar_id vagy spreadsheet_id
  service_account_email text,              -- amit az ügyfélnek meg kell osztania
  status text not null default 'pending',  -- pending | verified | failed
  verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  narrative_md text,                       -- admin által írt összefoglaló
  loom_url text,                           -- opcionális videós összefoglaló
  status text not null default 'draft',    -- draft | published
  published_at timestamptz,
  source text not null default 'n8n',      -- n8n | manual
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (project_id, period_start)
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number serial,
  org_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_by text not null references users(id),
  type text not null check (type in ('bug','feature','question','billing')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_on_client','resolved','closed')),
  subject text not null,
  description text not null,
  occurred_at timestamptz,                 -- bug esetén
  caller_phone text,                       -- bug esetén
  assigned_to text references users(id),
  first_response_at timestamptz,
  resolved_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id text not null references users(id),
  body text not null,
  is_internal boolean not null default false,   -- admin jegyzet, ügyfél nem látja
  created_at timestamptz not null default now()
);

create table ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  actor_id text references users(id),
  org_id uuid references organizations(id),
  action text not null,      -- 'document.download' | 'org.create' | 'report.publish' | ...
  entity_type text,
  entity_id text,
  metadata jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
```

**Indexek:** minden `org_id`, `project_id`, `ticket_id` FK-ra. Továbbá `reports(org_id, period_start desc)`, `tickets(org_id, status)`, `audit_log(org_id, created_at desc)`, `documents(org_id, category)`.

---

## 6. Auth — magic link

- **Nincs jelszó.** Auth.js Email provider, `nodemailer` SMTP-vel. Az ügyfél beírja az emailjét, kap egy belépő linket, ami 15 percig érvényes és egyszer használható (Auth.js alapértelmezés — ne írd felül lefelé).
- **Nincs nyilvános regisztráció.** A `signIn` callback **utasítsa el** azt az emailt, amihez nincs `users` rekord vagy nincs `org_members` sor. Az admin hozza létre a felhasználót.
- A magic link email legyen **magyar nyelvű, a ConvertedAI arculatával** — ne az Auth.js alapértelmezett angol sablonja. Egyszerű HTML, logóval, egy gombbal, plusz a nyers link szövegesen alatta.
- Session: adatbázis-alapú (Drizzle adapter), 30 nap, `updateAge` 24 óra. Így az ügyfélnek ritkán kell újra bejelentkeznie — ez fontos a célközönségnél.
- Middleware: minden `/(portal)` és `/(admin)` route mögött session ellenőrzés, `/bejelentkezes`-re irányítás `callbackUrl`-lel.

---

## 7. Fájlkezelés

- Feltöltés: Server Action, `FormData`. Ellenőrzés: MIME típus (`application/pdf`, `image/jpeg`, `image/png`), méret max 10 MB, **magic bytes ellenőrzés** a kiterjesztés helyett.
- Tárolás: `/data/uploads/{org_id}/{uuid}{ext}`. **Az eredeti fájlnevet soha ne használd útvonalként** — csak a DB-ben tárold megjelenítéshez. Path traversal ellen: a generált útvonal soha ne tartalmazzon user inputot.
- Letöltés: `GET /api/files/[documentId]` route handler → `requireOrgAccess` → `audit_log` írás → `createReadStream` + `Content-Disposition: attachment`. **A `/data/uploads` soha nem lehet a `public/` alatt és nem szolgálhatja ki közvetlenül a reverse proxy.**
- A volume kerüljön bele a meglévő backup scriptbe.

---

## 8. Ügyfél-oldali frontend

Route csoport: `app/(portal)/...`. Layout: bal sidebar (Áttekintés, Onboarding, Riportok, Ticketek, Beállítások), fejlécben logó + org név + profil menü. Reszponzív — az ügyfél gyakran telefonról nézi.

### 8.1 `/` — Áttekintés
- Projekt státusz kártya (`draft / building / live / paused`), ha `live`: mióta.
- Onboarding progress, ha `status = 'onboarding'` — "3/5 lépés kész", CTA a következő hiányzó lépésre.
- Legutóbbi publikált riport 3 kiemelt metrikája.
- Nyitott ticketek száma + legutóbbi 3.

### 8.2 `/onboarding` — Projektindító wizard

Öt lépés, mindegyik külön menthető, kilépés után folytatható. **Autosave 2 mp debounce-szal.** Progress a `project_briefs.completed_sections` alapján. Csak `client_owner` látja.

**1. Cégadatok** — cégnév, adószám, székhely, számlázási email, kapcsolattartó név/telefon.

**2. Üzleti brief** (`project_briefs.answers`, zod sémával). Szakaszonként 4–8 kérdés, mindegyikhez rövid magyar segédszöveg példával:
- *Alapok*: mivel foglalkozik, nyitvatartás napi bontásban, cím, jelenlegi telefonszám.
- *Az agent személye*: kívánt név, tegeződés/magázódás, hangnem.
- *Szolgáltatások*: dinamikus sorok — név, időtartam (perc), ár, rövid leírás.
- *Munkatársak*: név, titulus, mely szolgáltatásokat végzi.
- *Foglalási szabályok*: minimum előfoglalási idő, maximum előre foglalható idő, pufferidő, mi történjen ha nincs szabad időpont.
- *Gyakori kérdések*: kérdés-válasz párok (parkolás, megközelítés, fizetési módok, biztosítók).
- *Eszkaláció*: mikor kérjen visszahívást vagy kapcsoljon élő emberhez, milyen számra.
- *Amit az agent NE csináljon*: szabad szöveges tiltólista.

Ez a szakasz határozza meg az agent minőségét — a UX legyen türelmes, ne egy végtelen form.

**3. Telefonszám dokumentumok** — a `document_requests` alapján generált checklist. Minden sor: label, help text, státusz (*Hiányzik / Feldolgozás alatt / Elfogadva / Elutasítva + indoklás*), feltöltő gomb. Drag & drop, PDF/JPG/PNG, max 10 MB.

**4. Google fiók összekötése** — **nem self-serve.** Az oldal:
- Kiírja a service account email címét másolás gombbal.
- Lépésről lépésre magyar útmutató: Google Naptár → Beállítások → naptár → Megosztás adott személyekkel → a cím hozzáadása → jogosultság: *Változtathat az eseményeken*. Majd: Naptár azonosító kimásolása.
- Az ügyfél bemásolja a naptár azonosítót → mentés, `status = 'pending'`.
- Alatta: "Segítséget kérek ehhez" gomb → ticket nyitás `question` típussal, előre kitöltött tárggyal.
- A `verified` státuszt **az admin állítja be kézzel**, miután ellenőrizte. Nincs automatikus API-ellenőrzés ebben a verzióban.

**5. Áttekintés és beküldés** — összefoglaló szerkesztés linkekkel, "Beküldöm" gomb → `submitted_at`, majd webhook az n8n felé (lásd 9.2).

### 8.3 `/riportok`
- Lista: hónap, publikálás dátuma. Csak `published` riportok.
- `/riportok/[id]`:
  - KPI kártyák: összes hívás, sikeresen kezelt hívás, foglalás, foglalási arány, átlagos híváshossz, munkaidőn kívüli hívások aránya, becsült megmentett bevétel. Mindegyik mellett az előző hónaphoz képesti változás (delta + irány).
  - Napi hívásszám grafikon (`recharts` area chart).
  - Hívás-kimenetel bontás (foglalás / információkérés / visszahívás / megszakadt).
  - `narrative_md` markdown renderelve.
  - Ha van `loom_url`: beágyazott videó.
- Üres állapot magyarázattal: "Az első riport a live indulás utáni hónap 5. napján érkezik."

### 8.4 `/ticketek`
- Lista: szám, tárgy, típus, prioritás, státusz, utolsó aktivitás. Szűrés státuszra és típusra.
- `/ticketek/uj`: típusválasztó (Hiba / Fejlesztési kérés / Kérdés / Számlázás). **Hiba** esetén extra mezők: mikor történt, a hívó telefonszáma, mit tapasztalt, mi lett volna a helyes viselkedés + fájlmelléklet.
- Részletnézet: idővonalas üzenetfolyam, válaszmező, státuszjelző. **Az `is_internal = true` üzeneteket a Server Component szűrje ki** — soha ne kerüljenek a kliensbe, még rejtve sem.
- Az ügyfél maga is lezárhatja a ticketet (`resolved`).

### 8.5 `/beallitasok`
- Profil: név, telefon.
- Cégadatok megtekintése (szerkesztés ticketen keresztül).
- Nincs jelszókezelés, nincs értesítési preferencia — az értesítés emailben megy, mindenkinek.

---

## 9. n8n integráció

### 9.1 Bejövő: riport betöltés

`POST /api/webhooks/n8n/reports`

**Auth:** HMAC-SHA256. Az n8n a `X-Signature` fejlécben küldi a `hex(hmac_sha256(N8N_WEBHOOK_SECRET, raw_body))` értéket, `X-Timestamp`-ben a unix időt. A handler:
1. elutasít, ha `|now - timestamp| > 300 s`,
2. `crypto.timingSafeEqual`-lal hasonlít,
3. csak ezután parse-ol zod-dal.

Ne logold a raw bodyt.

```json
{
  "org_slug": "premium-dental",
  "period_start": "2026-07-01",
  "period_end": "2026-07-31",
  "metrics": {
    "calls_total": 184,
    "calls_answered": 179,
    "calls_missed": 5,
    "bookings_created": 63,
    "callbacks_requested": 21,
    "info_only": 88,
    "abandoned": 12,
    "avg_duration_sec": 96,
    "after_hours_calls": 71,
    "weekend_calls": 24,
    "estimated_revenue_huf": 1890000,
    "daily": [{ "date": "2026-07-01", "calls": 6, "bookings": 2 }]
  }
}
```

Viselkedés: **upsert** `(project_id, period_start)` kulcson, `status = 'draft'`. Nem publikálódik automatikusan. Ismeretlen `metrics` kulcsokat fogadj el és tárolj, de csak az ismerteket rendereld.

### 9.2 Kimenő: minden értesítés

**Az app nem küld értesítő emailt.** Helyette `POST` az `N8N_EVENTS_URL`-re, ugyanazzal a HMAC aláírással, ezekben az esetekben:

| Esemény | `event` mező | Payload lényege |
|---|---|---|
| Brief beküldve | `brief.submitted` | org, projekt, a teljes `answers` |
| Dokumentum feltöltve | `document.uploaded` | org, doc_type, file_name |
| Dokumentum elutasítva | `document.rejected` | org, doc_type, indoklás, címzett email |
| Riport publikálva | `report.published` | org, időszak, portál link, címzett emailek |
| Új ticket | `ticket.created` | ticket szám, típus, prioritás, tárgy, org |
| Ticket válasz | `ticket.replied` | ticket szám, ki válaszolt, címzett emailek |

Az n8n dönti el, kinek és milyen sablonnal megy az email. Ez tartja az appot vékonyan, és neked az n8n-ben marad a kontroll.

Hibatűrés: ha az n8n hívás elszáll, **az app művelete ne bukjon el**. Írd `audit_log`-ba a hibát, és próbálkozz újra egyszer 5 mp múlva.

---

## 10. Admin felület

Route csoport: `app/(admin)/admin/...`. Middleware: `requirePlatformAdmin()`, különben **404** (ne 403).

Szándékosan minimális — 5–10 ügyfélig ez elég.

### `/admin` — Teendők
Egyetlen lista, ami beavatkozást igényel: felülvizsgálatra váró dokumentumok, publikálatlan riportok, 24 óránál régebben válasz nélküli ticketek, elakadt onboardingok (>7 napja nincs haladás), `pending` Google kapcsolatok.

### `/admin/ugyfelek`
- Táblázat: név, státusz, projekt státusz, havi díj, onboarding %, utolsó aktivitás.
- **Új ügyfél** modal: cégnév → slug automatikusan, iparág, havi díj, kapcsolattartó neve + email. Létrehozáskor egy tranzakcióban: `organizations` + `projects` (draft) + `users` + `org_members` (`client_owner`) + iparági alapértelmezett `document_requests`. Utána kiküldi az első magic linket.
- Ügyfél részletnézet fülekkel:
  - **Áttekintés** — cégadatok, státusz váltás, belső jegyzet.
  - **Brief** — a válaszok olvasható nézetben, admin által is szerkeszthetően, plusz **"Másolás Markdown-ként"** gomb (hogy egyből agent promptba mehessen). Ez a gomb fontos, ne hagyd ki.
  - **Dokumentumok** — lista, letöltés, elfogad/elutasít indoklással, új `document_request` hozzáadása.
  - **Google** — kapcsolatok, státusz kézi átállítása `verified`-re.
  - **Riportok** — lista, szerkesztés, publikálás.
  - **Felhasználók** — tagok, új felhasználó hozzáadása, magic link újraküldése.

### `/admin/riportok`
- Minden riport, szűrés draft/published és hónap szerint.
- Szerkesztő: metrikák kézi felülírása, `narrative_md` markdown editor élő előnézettel, `loom_url` mező, előnézet ügyfélszemmel, publikálás.
- Kézi riport létrehozása (`source = 'manual'`).

### `/admin/ticketek`
- Minden org tickete egy nézetben. Szűrés státusz/típus/prioritás/org szerint.
- Alaprendezés: `urgent` előre, legrégebbi válasz nélküli felül, `waiting_on_client` hátra.
- Válasz + belső jegyzet egy szerkesztőben, kapcsolóval. Státusz, prioritás, hozzárendelés.

### `/admin/naplo`
- `audit_log` egyszerű táblázat, szűrés actor / org / action / dátum szerint.

---

## 11. Fázisok

### Fázis 1 — Váz, auth, onboarding, admin alap
- Projekt setup, Docker Compose, Drizzle séma + migrációk, seed script (1 platform admin + 1 demo org + 1 projekt).
- Auth.js magic link, magyar email sablon, session, middleware.
- `requireSession` / `requireOrgAccess` / `requirePlatformAdmin` helperek **+ unit tesztek**.
- Fájl feltöltés és authentikált letöltés, audit loggal.
- Ügyfél layout + `/` áttekintés + `/onboarding` mind az 5 lépéssel.
- Admin: teendők, ügyféllista, új ügyfél létrehozás, ügyfél részletnézet (Áttekintés, Brief, Dokumentumok, Google, Felhasználók fülek).
- `brief.submitted`, `document.uploaded`, `document.rejected` események kiküldése az n8n felé.

**Kész, ha:** egy ügyfél végigvihető létrehozástól a brief beküldéséig, két külön böngészőben (admin / ügyfél), és az egyik org felhasználója semmilyen URL-lel nem éri el a másik org adatát vagy fájlját.

### Fázis 2 — Riportok, ticketek
- n8n riport webhook + HMAC + upsert.
- Admin riport szerkesztő és publikálás, ügyfél riport nézet grafikonokkal.
- Ticketing teljes flow mindkét oldalon, mellékletekkel, belső jegyzettel.
- `report.published`, `ticket.created`, `ticket.replied` események.
- `/admin/naplo`.

---

## 12. Nem cél (ne építsd meg)

- Számlázás, fizetés.
- In-app értesítési központ, harang ikon, realtime, értesítési preferenciák — **minden értesítés emailben megy az n8n-ből**.
- Jelszavas belépés, 2FA, önkiszolgáló regisztráció.
- Google OAuth flow, automatikus naptár-ellenőrzés (Fázis 3, később).
- Riport PDF export az appból — a PDF-et az n8n generálja.
- Élő hívásmonitorozás, hanganyag lejátszás.
- Chat, announcementek, sablonkezelő, tömeges műveletek.
- Több nyelv. Csak magyar, de a szövegek `messages/hu.ts`-ben központosítva.

---

## 13. Minőségi elvárások

- **Biztonság:** minden Server Action és Route Handler első sora a megfelelő guard. Fájl kiszolgálás csak authentikált route handleren át. Semmilyen titok ne kerüljön `NEXT_PUBLIC_` változóba.
- **Hibakezelés:** magyar, emberi hibaüzenetek. Soha ne dobj nyers Postgres hibát a felhasználóra.
- **Üres állapotok:** minden lista kapjon magyarázatot és következő lépést, ne csak "Nincs adat".
- **Loading:** `loading.tsx` és skeleton minden route-on.
- **Akadálymentesség:** billentyűzettel bejárható, `aria-label` az ikongombokon, form hibák `aria-describedby`-jal kötve.
- **Dátum/idő:** tárolás UTC-ben, megjelenítés `Europe/Budapest` zónában, magyar formátumban (`2026. 07. 26.`).
- **Pénz:** integer forintban, ezres tagolással, `Ft` utótaggal.

---

## 14. Infrastruktúra

`docker-compose.yml`:

```yaml
services:
  portal:
    build: .
    restart: unless-stopped
    env_file: .env
    volumes:
      - /data/uploads:/data/uploads
    ports:
      - "127.0.0.1:3100:3000"
```

- A Postgres **nem** kerül a compose-ba — a meglévő példányt használjuk, külön adatbázissal és külön DB userrel, aki **csak** ehhez az adatbázishoz fér hozzá.
- A `portal` csak localhoston figyel; a meglévő reverse proxy terminálja a TLS-t `ugyfel.convertedweb.com`-on.
- Dockerfile: multi-stage, `output: "standalone"`, non-root user.
- Migráció futtatása belépéskor: `drizzle-kit migrate` az app indulása előtt, külön compose parancsban vagy entrypoint scriptben.

### Env változók

```
DATABASE_URL=postgres://portal:...@host:5432/convertedai_portal
AUTH_SECRET=
AUTH_URL=https://ugyfel.convertedweb.com
EMAIL_SERVER=smtp://user:pass@smtp.zoho.eu:587
EMAIL_FROM="ConvertedAI <noreply@convertedweb.hu>"
N8N_WEBHOOK_SECRET=
N8N_EVENTS_URL=https://app.convertedweb.com/webhook/portal-events
UPLOAD_DIR=/data/uploads
GOOGLE_SERVICE_ACCOUNT_EMAIL=
```

Készíts `.env.example`-t. A `.env` ne kerüljön verziókövetésbe.

---

## 15. Amit szállíts

1. Futtatható Next.js projekt — `docker compose up` egy kitöltött `.env`-vel elindul.
2. `db/schema.ts` + generált migrációk a `drizzle/` mappában.
3. `db/seed.ts` — 1 platform admin, 2 org, 1-1 projekt, 1 publikált riport, 2 ticket, 3 document_request.
4. `README.md` — setup lépésről lépésre: adatbázis és DB user létrehozása, migráció, seed, env kitöltés, reverse proxy példa konfiguráció, backup megjegyzés a volume-ra.
5. `docs/n8n-integration.md` — a bejövő riport payload sémája, a kimenő események listája payload példákkal, és egy másolható n8n Code node snippet a HMAC aláírás generálásához/ellenőrzéséhez.

**Minden fázis végén** írd le röviden, mit építettél meg, mit hagytál `TODO`-nak, és milyen döntést hoztál, ami eltér ettől a brieftől.
