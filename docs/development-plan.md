# ConvertedAI Portal - reszletes fejlesztesi roadmap

## 0. Termekstrategiai irany

A projekt ket egymasra epulo termekre bonthato. Eloszor egy admin-slice keszul a meglevo, fizeto ugyfeleknek; az onkiszolgalo voice agent-epito csak validacio utan indul.

### Admin-slice - elso termek

A portal kivaltja az emailes dokumentumbekerest, az alap allapot-kommunikaciot es a szetszort adatgyujtest. Az ugyfel a sajat fiokjaban tolti fel a szukseges dokumentumokat, latja a projektje allapotat, a call logot es az n8n-bol erkezo adatokat. A Telnyx-es es agent-provisioning folyamatot tovabbra is Norbi inditja es vezerli n8n-ben.

### Onkiszolgalo agent-epito - kesobbi termek

Csak akkor indul, ha az admin-slice 1-2 meglevo ugyfelnel bizonyithatoan csokkenti az adminisztracios terhet, es az ugyfelek problema nelkul hasznaljak. Ekkor az ugyfel iranyitott kerdoivvel sajat agentet hozhat letre es szerkeszthet.

## 1. Uj projektcel

A projekt celja egy sajat portal, amely ket egymasra epulo funkciot lat el. Az elso verzio ne teljes SaaS platform legyen; a legfontosabb validacios pont az emailes adminisztracio kivaltasa.

- feltoltheti a projekthez szukseges dokumentumokat es tudasbazis-fajlokat,
- megnezheti a dokumentumok, a Telnyx-folyamat es a projekt allapotat,
- megnezheti a call logot es az n8n-bol erkezo automatizacios adatokat,
- kesobb sajat voice agentet hozhat letre es szerkeszthet.

Az elso verzio ne teljes, kesz SaaS platform legyen. Eloszor egy stabil admin-portal keszuljon el. A voice AI, Telnyx, dokumentumfeldolgozas, indexeles es automatizacio n8n-ben fusson, a portal pedig ezeket kezelje es jelenitse meg.

## 2. Validacios hipotezisek es meres

Merjuk pilot ugyfelenkent:

- a portal elotti es utani email/hivas oda-vissza mennyiseget,
- a dokumentumok elso feltoltesig eltelt idot,
- a hianyos dokumentumok szamat,
- Norbi adminisztracios idejet,
- a portal hasznalati hibait es elakadasait.

A Fazis 1 sikere nem a "tetszik" visszajelzes, hanem az adminisztracios teher merheto csokkenese.

## 3. Fejlesztesi elvek

- A portal legyen a felhasznalo egyetlen kezelofelulete.
- Egy felhasznalo csak a sajat workspace-ehez es agentjeihez ferjen hozza.
- Minden kulso integracio szerveroldalon vagy n8n-en keresztul fusson.
- Az agent beallitasai reszlegesen is menthetoek legyenek.
- Az elso kiadasban keves, de vegig mukodo folyamat legyen.
- Az adatmodell kesobb tamogassa a tobb agentet, tobb felhasznalot, riportokat es billinget.
- Minden fazis kulon futtathato es tesztelheto legyen.
- A `settings jsonb` strukturalt, iranyitott kerdoiv-mezoket tartalmazzon; szabad system prompt nem kerulhet az ugyfelhez.

## 4. Scope fazisonkent

### Fazis 1-3: admin-slice

Tartalmazza a magic linkes belepest, sajat portal kezdooldalt, meglevo projekt nezetet, dokumentum- es tudasbazis-fajlok feltolteset, call log es n8n-adatok read-only megjeleniteset, valamint a Norbi altal n8n-en keresztul inditott Telnyx-folyamat statuszat.

### Fazis 1-3-ban tudatosan nincs

- agent onallo letrehozasa vagy beallitasa,
- kliens altal inditott Telnyx-szamigenyles,
- teljes admin backoffice,
- tobbfele jogosultsagi szerepkor,
- ticketing, riportok, billing es Google OAuth,
- szabad prompt-szerkeszto vagy alkalmazason beluli embedding pipeline.

### Fazis 4-6: validacio utani self-service retegek

Csak a pilot sikeres validacioja utan jon az iranyitott agent-beallitasi kerdoiv, az agent aktivacio es legkesobb a kliens altal indithato Telnyx-szamigenyles.

## 5. Javasolt architektura

### Portal

- Next.js 15 App Router
- TypeScript strict
- Tailwind CSS + shadcn/ui
- `lucide-react`
- `react-hook-form` + `zod`
- Server Components alapertelmezetten
- Minden adatmodositas Server Action vagy Route Handleren keresztul

### Backend es workflow

- n8n: Telnyx-muveletek, agent-provisioning, dokumentumfeldolgozas, tudasbazis-indexeles, ertesitesek
- Supabase Database: tartos portal-adatok es managed Postgres
- Supabase kliens/server integration; az adatbazis-hozzaferes legyen szerveroldalon kontrollalt
- Auth.js v5 magic linkes belepessel
- nodemailer SMTP-n keresztul csak a magic linkhez
- fajlok szerveroldali lemezen, Docker volumekent (`/data/uploads`)
- Docker Compose, a meglevo reverse proxy mogott

A portal ne legyen masodik automatizacios motor. Adatot ment, webhookot kuld, statuszt olvas es kezelofeluletet ad.

## 6. Fokozatos fejlesztesi fazisok

### Fazis 0 - Alapok es technikai vaz

Cel: elindithato projekt, amelyre biztonsagosan lehet epiteni.

Feladatok:

- Next.js projekt es Docker Compose setup.
- Supabase projekt, kornyezeti valtozok es adatbazis-kapcsolat beallitasa.
- Auth.js magic linkes belepes.
- Alap tenant-ellenorzes: csak a bejelentkezett felhasznalo sajat adatai erhetoek el.
- Portal layout: fejlec, navigacio, felhasznaloi menu, ures allapotok.
- `.env.example`, README es alap Vitest setup.
- Minimalis adatmodell es elso migracio.

Kesz, ha a felhasznalo belephet, a portalon belul maradhat, es egy ures sajat workspace-et lat.

### Fazis 1 - Admin-slice: dokumentumok es projektadatok

Ez az elso valodi termekfazis es a validacios kor.

Feladatok:

- `/portal` dashboard sajat projektekkel.
- `/portal/projektek/[id]` projektreszletek.
- Dokumentumkategoriak: `utility_bill`, `evny_extract`, `id_document`, `knowledge_base`, `other`.
- PDF, DOCX es TXT feltoltes; kep csak pilotigeny eseten.
- Fajllista nevvel, merettel, datumokkal, statuszszal es hibaokkal.
- Logikai fajltorles es rovid eletu signed download URL.
- Call log es n8n-bol erkezo adatok read-only megjelenitese.
- `knowledge.file.uploaded` es `knowledge.file.deleted` webhook.
- Dokumentum statusz: `uploaded`, `processing`, `ready`, `failed`.

Ebben a fazisban a portal ne kommunikaljon onallo agent-letrehozast. A cel az emailes dokumentumbekeres es statuszkerdesek kivaltasa.

Kesz, ha legalabb egy pilot ugyfel portalon tolti fel az anyagait, latja a projektje statuszat es call logjat, es az emailes oda-vissza merhetoen csokken.

### Fazis 2 - Dokumentumok es tudasbazis

Cel: az agenthez tartozo tudastar feltoltheto es kovetheto legyen.

Feladatok:

- `/portal/projektek/[id]/dokumentumok` teljes dokumentumnezet.
- n8n feldolgozasi workflow es callback.
- HMAC, timestamp, event id es idempotens feldolgozas.
- Egyszeri retry es diagnosztizalhato hibaallapot.
- Feltolteskor a portal mentese ne bukjon el attol, hogy n8n atmenetileg nem elerheto.

Az elso verzio nem az alkalmazasban epiti meg az embedding pipeline-t. A portal tarol es statuszt jelenit meg, az n8n feldolgoz.

Kesz, ha feltoltes utan elindul a feldolgozas, a statusz visszaerkezik, es ujrakuldeskor nincs duplikalt feldolgozas.

### Fazis 3 - Telnyx adminisztracio

Cel: a telefonszam-igenyleshez szukseges dokumentumok es allapot lathatova valjanak, mikozben az igenylest Norbi inditja n8n-en keresztul.

Feladatok:

- `/portal/projektek/[id]/telefon` oldal.
- Szukseges EVNY- es kozuzemi dokumentumok megjelenitese.
- Hozzarendelt vagy igenyelt szam read-only megjelenitese.
- Allapotok: `not_connected`, `requested`, `provisioning`, `connected`, `failed`.
- n8n kezeli a Telnyx credentialt es a tenyleges muveletet.
- `phone.number.search_requested` es `phone.number.connection_requested` esemeny csak admini inditassal.

Kesz, ha az ugyfel latja, mi hianyzik es hol tart a folyamat, de a kliens nem tud jogosulatlan Telnyx-muveletet inditani.

### Fazis 4 - Pilot stabilizalas es dontesi kapu

Cel: a valos hasznalat alapjan eldonteni, hogy erdemes-e self-service agent-buildert epiteni.

Feladatok:

- Mobil UX, feltoltesi szovegek es statuszok finomitasa.
- Hibak, n8n ujraprobalasok es alap esemenynaplo.
- 1-2 pilot ugyfel vegigvezetese.
- Email/hivas baseline es uj folyamat osszevetese.
- Supportkerdesek es elakadasok merese.
- Dontesi gate az agent-builder elott.

Csak akkor indulhat a kovetkezo reteg, ha merhetoen csokkent az adminisztracios teher, nincs kritikus biztonsagi hiba, es a pilot ugyfelek a portalt tamogatasi beavatkozas nelkul hasznaljak.

### Fazis 5 - Iranyitott self-service agent-builder

Cel: a validalt admin-portalra epulve az ugyfel maga hozhasson letre egyszerubb voice agentet.

Feladatok:

- `/portal/agents/new` es `/portal/agents/[id]/beallitasok`.
- Iranyitott kerdoiv: nev, bemutatkozas, nyelv, hangnem, mukodesi cel, nyitvatartas, eszkalacio, tiltott temak, gyakori kerdesek.
- Reszleges mentes, szekcio-statusz, draft allapot.
- Korlatozott Zod schema, szabad system prompt nelkul.
- `agent.created` es `agent.settings.updated` n8n esemenyek.
- `draft`, `building`, `active`, `paused`, `failed` statuszok elokeszitese.

Kesz, ha egy pilot ugyfel Norbi kozbeavatkozasa nelkul vegigmegy a kerdoiven, az adat mentheto, es a hianyos konfiguracio nem kuldheto aktivacioba.

### Fazis 6 - Agent aktivacio es alap teszteles

Cel: az agent ellenorzottan aktivizalhato legyen.

Feladatok:

- Aktivacios elofeltetelek ellenorzese: alapbeallitas, kesz tudasbazis, telefonszam.
- `agent.activation.requested` webhook.
- n8n provisioning es statusz callback.
- Egyszeru teszthivas vagy tesztelesi utmutato.
- Aktiv, szunetelt es hibaallapotok.

Kesz, ha hianyos agent nem aktivizalhato es minden allapot kovetheto a portalon.

### Fazis 7 - Telnyx self-service es piacnyitas

Cel: csak bizonyitott self-service igeny eseten onkiszolgalova tenni a szamigenylest, majd kontrollaltan uj SMB-ugyfelek fele nyitni.

Feladatok:

- orszag, korzetszam vagy szamtipus megadasa,
- szamkereses n8n/Telnyx-en keresztul,
- szam kivalasztasa es igenylese,
- `initiated_by` alapjan admin/client flow elkulonitese,
- havidijas dobozos csomag es feluras egyedi workflow-tervezes szetvalasztasa.

Egyeb funkciok - tobb felhasznalo, billing, riportok, ticketing, Google-integraciok, verziozott promptok - csak igazolt igeny alapjan kovetkezzenek.

## 7. Minimalis adatmodell

Az eredeti brief teljes adatmodellje kesobbi allapot. Az elso portalhoz Supabase Database-ben ez a mag elegendo:

~~~text
users
organizations
org_members
projects
project_briefs
documents
phone_connections
call_logs
automation_events
~~~

A briefben szereplo `projects` entitas legyen a voice agent domain entitasa; a feluleten ezt nevezzuk Voice agentnek.

Fontos mezok:

- `projects`: `org_id`, `name`, `slug`, `agent_display_name`, `settings jsonb`, `status`, `phone_number`, `created_at`, `updated_at`.
- `project_briefs`: `project_id`, `answers jsonb`, `completed_sections`, `submitted_at`.
- `documents`: `org_id`, `project_id`, `file_name`, `storage_path`, `mime_type`, `size_bytes`, `processing_status`, `deleted_at`.
- `phone_connections`: `org_id`, `project_id`, `provider`, `phone_number`, `telnyx_number_id`, `status`, `last_error`, `connected_at`.

Az `settings` es `answers` JSONB Zod schemaval legyen validalva. Kulon mezot csak akkor vezessunk be, ha az adatot tenylegesen szurni vagy listazni kell.

## 8. n8n webhook szerzodesek

Minden webhook szerveroldali titkos kulccsal, HMAC-SHA256 alairassal es idobelyeggel mukodjon. A hibas n8n hivas ne tegye ervenytelenne a mar elmentett portal-adatot; az esemenyt naplozni es ujraprobalni kell.

Portal -> n8n esemenyek Fazis 1-3-ban:

- `knowledge.file.uploaded`
- `knowledge.file.deleted`
- `phone.number.search_requested` - admin altal inditva
- `phone.number.connection_requested` - admin altal inditva

Portal -> n8n esemenyek Fazis 5-7-ben:

- `agent.created`
- `agent.settings.updated`
- `agent.activation.requested`
- `phone.number.search_requested` - csak a self-service fazistol kliens altal
- `phone.number.connection_requested` - csak a self-service fazistol kliens altal

Payload:

~~~json
{
  "event": "knowledge.file.uploaded",
  "event_id": "uuid",
  "organization_id": "uuid",
  "project_id": "uuid",
  "actor_id": "user-id",
  "payload": {},
  "occurred_at": "2026-08-13T10:00:00.000Z"
}
~~~

n8n -> portal callbackok:

- `POST /api/webhooks/n8n/agent-status`
- `POST /api/webhooks/n8n/knowledge-status`
- `POST /api/webhooks/n8n/phone-status`
- `POST /api/webhooks/n8n/call-logs`

A handler ellenorizze az alairast, az idobelyeg frissesseget, az event_id egyszeri feldolgozasat, valamint az organization/project egyezest.

## 9. Biztonsagi minimum

- Magic linkes belepes, nyilvanos regisztracio nelkul.
- Minden Server Action es Route Handler session- es organization-jogosultsagot ellenoriz.
- A felhasznalo csak a sajat agentjeit, dokumentumait es telefonszam-kapcsolatait latja.
- A fajlok nem publikusak; letoltes csak rovid eletu signed URL-lel.
- Tokenek, webhook titkok es Telnyx credentialok nem kerulnek kliensoldali env-be.
- Telnyx kulcsok csak n8n credential store-ban legyenek.
- MIME-type, fajlmeret es fajlnev validacio szerveroldalon is.
- Soft delete a dokumentumokra es agentekre.
- Ne kerjunk Google jelszot, API-kulcsot vagy service account JSON-t.
- A Google-kapcsolat instrukcio legyen, ne credential-begyujtes.
- A call log telefonszamai alapertelmezetten maszkolva jelenjenek meg.
- A fajlok tarolasi path-ja organization/project alapjan legyen kepzett; path traversal nem engedheto.

## 10. Reszletes munkacsomagok

### Munkacsomag A - Scope es pilot elokeszites

- 1-2 meglevo ugyfel kivalasztasa.
- A regi emailes folyamat dokumentalasa.
- Baseline meres felvetele.
- Dokumentumkategoriak es kotelezo mezok rogzitese.
- Call log minimalis payload veglegesitese.
- Telnyx admin-flow inputjainak osszegyujtese.

### Munkacsomag B - Portal foundation

- Next.js, TypeScript, lint, build es Docker setup.
- Supabase Database schema, migraciok es kornyezeti konfiguracio.
- Auth.js magic link.
- `requireSession` es `requireOrgAccess` guardok.
- Portal layout, navigation, loading/error/empty state.
- `.env.example` es README.

### Munkacsomag C - Pilot dashboard

- `projects` es `project_briefs` queryk.
- `/portal` projektlista.
- `/portal/projektek/[id]` reszletek.
- Statuszok, hianyzo dokumentumok es kovetkezo teendo.
- Sajat organization szures minden adatelernel.

### Munkacsomag D - Dokumentumkezeles

- `documents` schema es kategoriak.
- Biztonsagos upload es tarolas.
- Fajlmeret, MIME es kiterjesztes validacio.
- Lista, torles, signed download.
- n8n esemeny es callback.

### Munkacsomag E - Call log es automatizacios adatok

- `call_logs` es `automation_events` schema.
- n8n import callback.
- Read-only call log lista.
- Maszkolt telefonszam, rovid osszefoglalo, datum es statusz.
- Alap hiba- es esemennaplo.

### Munkacsomag F - Telnyx admin-flow

- `phone_connections` schema.
- Telefon statusz oldal.
- Szukseges dokumentumok megjelenitese.
- Norbi altal inditott n8n flow statusz callback.
- Kliensoldali Telnyx-muvelet teljes tiltasa.

### Munkacsomag G - Pilot stabilizalas

- Mobil UX javitasa.
- Magyar szovegek finomitasa.
- n8n retry es hibajelzes.
- Hasznalati meres.
- Pilot interjuk es supportkerdesek elemzese.
- Dontesi gate a self-service elott.

### Munkacsomag H - Self-service agent-builder

- Iranyitott kerdoiv.
- Zod schema es reszleges mentes.
- Agent draft/building/active/paused statuszok.
- n8n agent.created es agent.settings.updated esemenyek.
- Szabad system prompt nelkul.

### Munkacsomag I - Agent aktivacio es Telnyx self-service

- Aktivacios elofeltetelek.
- n8n provisioning.
- Teszthivas vagy tesztelesi utmutato.
- Csak kesobb kliens altal indithato Telnyx-szamigenyles.

## 11. Javasolt PR-bontas

1. `codex/portal-foundation` - auth, adatbazis, portal shell, tenant guard
2. `codex/pilot-project-dashboard` - projektlista, projektreszletek, statuszok
3. `codex/admin-document-upload` - feltoltes, kategoriak, fajllista, statuszok
4. `codex/n8n-document-workflow` - webhook, callback, idempotencia, retry
5. `codex/admin-call-log-view` - call log es n8n adatok read-only nezet
6. `codex/telnyx-admin-flow` - admin-vezerelt Telnyx allapot
7. `codex/pilot-stabilization` - meres, UX, hibajavitas, dontesi gate
8. `codex/voice-agent-management` - csak validacio utan: kerdoiv es draft mentes
9. `codex/agent-activation` - provisioning, statuszok, teszteles
10. `codex/telnyx-self-service` - csak validacio utan: kliens altal indithato igenyles

Minden PR utan legyen futtathato build, migracio es legalabb a kritikus szerveroldali ellenorzesekre unit teszt.

## 12. Release gate-ek es sikerkriteriumok

### Gate A - Foundation

- Magic link mukodik.
- Tenant guard tesztelt.
- Docker build sikeres.
- Migracio uj kornyezetben lefut.

### Gate B - Pilot MVP

- Projekt megjelenik.
- Dokumentum feltoltheto.
- Dokumentum statusz megjelenik.
- Signed download mukodik.
- n8n esemeny elkuldheto.

### Gate C - Admin-slice pilot

- Call log latszik.
- Telnyx statusz latszik.
- 1-2 pilot ugyfel hasznalja.
- Az email/hivas oda-vissza merhetoen csokken.

### Gate D - Self-service dontes

- Nincs kritikus tenant- vagy fajlbiztonsagi hiba.
- A pilotok tamogatasi beavatkozas nelkul hasznaljak a portalt.
- A portal kevesebb munkat general, mint amennyit kivalt.
- Valos igeny mutatkozik az agent-beallitasra.

### Gate E - Self-service agent

- Iranyitott kerdoiv mukodik.
- Draft mentes mukodik.
- n8n provisioning statusz visszaerkezik.
- Hianyos konfiguracio nem aktivizalhato.

### Gate F - Piacnyitas

- A portal a meglevo ugyfelkoron stabil.
- Van support- es onboarding-folyamat.
- A csomag- es arazasi teszt elkulonul a fejlesztestol.
- Uj SMB-ugyfel kontrollalt pilotkent indithato.

## 13. Elso szakasz vegso sikerkriteriuma

Az elso szakasz akkor sikeres, ha:

- egy meglevo ugyfel belephet a portalra,
- feltolti a kozuzemi szamlat, EVNY-kivonatot es tudastarfajlokat,
- latja a projekt, a dokumentumok, a call log es a Telnyx-folyamat statuszat,
- az n8n feldolgozasok diagnosztizalhatoak,
- az email/hivas oda-vissza merhetoen csokken,
- az adatok organization szinten el vannak kulonitve,
- a fontos muveletek n8n esemenykent tovabbithatok,
- a portal kevesebb adminisztraciot igenyel, mint a regi folyamat.

## Kovetkezo fejlesztesi lepes

Eloszor a `codex/portal-foundation`, majd a `codex/pilot-project-dashboard`, `codex/admin-document-upload`, `codex/n8n-document-workflow`, `codex/admin-call-log-view` es `codex/telnyx-admin-flow` valosuljon meg. Az onkiszolgalo agent-builder csak a pilot meroszamai alapjan indulhat el.
