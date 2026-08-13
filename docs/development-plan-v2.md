# ConvertedAI Portal - fokozatos fejlesztesi terv (v2)

## 0. Valtozas az eredeti tervhez kepest

Az eredeti terv egy dobozos, onkiszolgalo voice agent platformot celzott meg uj piaci
felhasznalokkal. A validacios kerdes ("van-e kereslet, talalok-e ra felhasznalokat") atalakitotta
a sorrendet:

- A portal **elsokent belso admin-eszozkent indul a meglevo, fizeto ugyfeleken**, nem uj piaci
  temekkent.
- A dobozos, onkiszolgalo agent-epito resz **csak validalt igeny eseten** kezdodik el, miutan az
  admin-resz bevalt a meglevo ugyfelkoron.
- Ez a legkockazatosabb feltevest (hajlandoak-e a vallalkozasok maguk hasznalni egy uj feluletet,
  es maguk konfiguralni egy voice agentet) a legolcsobb es legbiztonsagosabb helyre - a mar
  fizeto, bizalommal levo ugyfelekre - tolja, mielott barmi idegen felhasznalo fele nyilna.

A validacio merceje a Fazis 1-ben **nem bevetel es nem "tetszik" visszajelzes**, hanem meromszam:
hany email/hivas oda-vissza sporolodik meg ugyfelenkent a jelenlegi folyamathoz (kozuzemi szamla,
EVNY-kivonat, dokumentacio, tudasbazis-fajlok emailben bekerese) kepest.

## 1. Uj projektcel

A projekt celja egy sajat portal, amely ket egymasra epulo funkciot lat el:

**A. Admin-slice (elsokent, meglevo ugyfeleken)**
- az ugyfelek sajat fiokjukban toltik fel a projekthez szukseges fajlokat (dokumentaciok,
  tudasbazis, telefonszam-igenylesehez szukseges azonositok, kozuzemi szamla, Google fiok
  hozzaferes adatai) - email helyett,
- ugyanitt latjak a call logot es az automatizaciobol (n8n) beerkezo adatokat,
- a folyamatot (Telnyx-igenyles, agent-provisioning) tovabbra is Norbi vezerli n8n-en keresztul.

**B. Onkiszolgalo agent-epito (kesobb, validacio utan)**
- a felhasznalo maga hozhat letre es szerkeszthet egy egyszerubb voice agentet sajat fiokjaban,
  havidijas modelben,
- a komplexebb, egyedi workflow-tervezes tovabbra is feluras, tanacsadoi/uzemeltetoi szolgaltatas
  marad Norbi resztol,
- ez a resz csak akkor indul, ha az admin-slice bevalt a meglevo ugyfeleken.

Az elso verzio ne teljes, kesz SaaS platform legyen. A voice AI, Telnyx, dokumentumfeldolgozas,
indexeles es automatizacio tovabbra is n8n-ben fusson, a portal ezeket kezeli es jeleniti meg.

## 2. Fejlesztesi elvek

- A portal legyen a felhasznalo egyetlen kezelofelulete az adminisztraciohoz es (kesobb) az agent
  kezelesehez.
- Egy felhasznalo csak a sajat workspace-ehez es projektjeihez ferjen hozza.
- Minden kulso integracio szerveroldalon vagy n8n-en keresztul fusson.
- Az elso kiadas a meglevo ugyfelek adminisztracios terhet csokkentse, nem uj piacot celoz.
- A projekt/agent beallitasai reszlegesen is menthetoek legyenek.
- Az adatmodell mar most tamogassa a kesobbi agent-epito reteget, hogy ne kelljen migralni.
- A `settings jsonb` mezo strukturaja korlatozott, kerdoiv-jellegu mezokeszletre keszuljon fel -
  **ne** szabad szoveges system prompt mezore. Ez kovetkezik abbol a korabbi elvbol, hogy a kliens
  nem kaphat kozvetlen hozzaferest a system prompthoz (fehercimkezes torese, guardrail-kockazat).
  A dobozos agent-epito ezert iranyitott kerdoivvel fog mukodni, nem szabad prompt-szerkesztovel.
- Minden fazis kulon futtathato es tesztelheto legyen.

## 3. Hatokor fazisonkent

### Fazis 1-ben legyen (admin-slice)

- magic linkes belepes,
- sajat portal kezdooldal,
- projekt/ugyfel nezet (`/portal/agents/[id]`, terminologiaban egyelore "projekt", nem "agent
  letrehozasa"),
- dokumentum- es tudasbazis-fajlok feltoltese (kozuzemi szamla, EVNY-kivonat, ID, egyeb),
- egyszeru fajllista feltoltesi/feldolgozasi statusszal,
- call log es automatizaciobol erkezo adatok megjelenitese (read-only, n8n-bol),
- alap webhook esemenyek az n8n fele.

### Fazis 1-ben tudatosan ne legyen

- agent alapbeallitasok onallo szerkesztese az ugyfel altal,
- onallo agent-letrehozas a kliens oldalarol,
- Telnyx szam onkiszolgalo igenylese a kliens oldalarol (Norbi inditja n8n-en keresztul, az
  ugyfel csak a szukseges dokumentumokat tolti fel),
- teljes admin backoffice,
- tobbfele jogosultsagi szerepkor,
- ticketing,
- riportok es grafikonok,
- realtime ertesitesi kozpont,
- Google OAuth vagy automatikus Google Calendar-integracio,
- online fizetes es billing,
- sajat voice AI motor,
- fejlett prompt editor vagy vizualis workflow builder,
- automatikus embedding pipeline az alkalmazasban.

### Fazis 4+ -ben (dobozos agent-epito, csak validacio utan)

- onallo voice agent letrehozasa sajat fiokon belul,
- agent alapbeallitasok szerkesztese **iranyitott kerdoivvel** (nem szabad prompt-szerkesztovel),
- Telnyx telefonszam onkiszolgalo igenylese vagy hozzarendelese,
- agent statusz: draft, building, active, paused,
- havidijas, dobozos csomag + feluras egyedi workflow-tervezes ajanlat.

## 4. Javasolt architektura

### Portal

- Next.js 15 App Router
- TypeScript strict
- Tailwind CSS + shadcn/ui
- `lucide-react`
- `react-hook-form` + `zod`
- Server Components alapertelmezetten
- Minden adatmodositas Server Action vagy Route Handleren keresztul

### Backend es workflow

- n8n: Telnyx-muveletek, agent-provisioning, dokumentumfeldolgozas, tudasbazis-indexeles,
  ertesitesek
- Postgres: tartos portal-adatok
- Drizzle ORM es drizzle-kit
- Auth.js v5 magic linkes belepessel
- nodemailer SMTP-n keresztul csak a magic linkhez
- fajlok szerveroldali lemezen, Docker volumekent (`/data/uploads`)
- Docker Compose, a meglevo reverse proxy mogott

A portal ne legyen masodik automatizacios motor. Adatot ment, webhookot kuld, statuszt olvas es
kezelofeluletet ad.

## 5. Fokozatos fejlesztesi fazisok

### Fazis 0 - Alapok es technikai vaz

Cel: elindithato projekt, amelyre biztonsagosan lehet epiteni.

Feladatok:

- Next.js projekt es Docker Compose setup.
- Postgres kapcsolat es Drizzle konfiguracio.
- Auth.js magic linkes belepes.
- Alap tenant-ellenorzes: csak a bejelentkezett felhasznalo sajat adatai erhetoek el.
- Portal layout: fejlec, navigacio, felhasznaloi menu, ures allapotok.
- `.env.example`, README es alap Vitest setup.
- Minimalis adatmodell es elso migracio - mar felkeszitve a kesobbi agent-epito retegre (lasd 6.
  szakasz).

Kesz, ha a felhasznalo belephet, a portalon belul maradhat, es egy ures sajat workspace-et lat.

### Fazis 1 - Admin-slice a meglevo ugyfeleken (EZ A VALODI VALIDACIO)

Cel: kivaltani az email-alapu dokumentumbekerest es allapot-kommunikaciot legalabb 1-2 meglevo
ugyfelnel.

Feladatok:

- `/portal` dashboard sajat projektekkel.
- `/portal/agents/[id]` projekt reszletei - meg nem agent-letrehozas, hanem a mar futo
  szolgaltatashoz tartozo felulet.
- Agenthez/projekthez kotott dokumentumfeltoltes:
  - kozuzemi szamla,
  - EVNY-kivonat,
  - szemelyi/egyeb azonosito dokumentumok,
  - tudasbazis-fajlok (PDF, DOCX, TXT kezdetben; kep csak valos igeny eseten),
  - Google fiok hozzaferesi adatok/instrukciok.
- Meretkorlat, tipusellenorzes es magyar hibauzenetek.
- Fajllista fajlnevvel, merettel, idoponttal, statusszal es hibauzenettel.
- Logikai fajltorles.
- Call log es automatizaciobol erkezo adatok megjelenitese (read-only nezet, n8n-bol toltve).
- `knowledge.file.uploaded` es `knowledge.file.deleted` webhook.
- Feldolgozasi statusz: `uploaded`, `processing`, `ready`, `failed`.
- n8n feldolgozza a fajlt, majd visszakuldi az eredmenyt.

Kesz, ha legalabb egy meglevo ugyfelnel a dokumentumbekeres es allapotkovetes a portalon tortenik
email helyett, es merheto az email-oda-vissza csokkenese a korabbi folyamathoz kepest.

**Ez a meromszam donti el, hogy erdemes-e folytatni a kovetkezo fazisokkal.**

### Fazis 2 - Telnyx telefonszam adminisztracioja (meg Norbi-vezerelt)

Cel: a telefonszam-igenyleshez szukseges dokumentumok es allapot lathatova valjanak a portalon,
de a tenyleges igenyles Norbi altal, n8n-en keresztul induljon.

Feladatok:

- `/portal/agents/[id]/phone` oldal, ahol az ugyfel latja a hozzarendelt/igenyelt szam allapotat.
- Szukseges dokumentumok (EVNY, kozuzemi szamla) feltoltese ugyanitt (a Fazis 1 fajlfeltoltesere
  epulve).
- Allapotok: `not_connected`, `requested`, `provisioning`, `connected`, `failed`.
- n8n kezeli a Telnyx credentialt, a szamkeresest, igenylest es projekthez kotest - a kliens nem
  indit kozvetlen Telnyx-muveletet.
- `phone.number.search_requested` es `phone.number.connection_requested` webhook (Norbi altal
  inditva, nem a kliens altal).

Kesz, ha az ugyfel a portalon latja a szam-osszekotes allapotat, es a szukseges dokumentumokat ott
tudja feltolteni, Norbi pedig a hatterben n8n-en keresztul intezi az igenylest. A Telnyx credential
nem kerulhet a kliensbe vagy az adatbazisba.

### Fazis 3 - Stabilizalas a meglevo ugyfeleken

Cel: a valos hasznalat alapjan finomitani az admin-slice folyamatait, mielott barmi ujabb reteg
epulne ra.

Feladatok:

- mobil UX javitasa,
- fajlfeltoltesi es allapot-szovegek finomitasa,
- hibas n8n workflow-k ujraprobalasa,
- supporthoz szukseges minimalis admin megtekintes,
- fontos felhasznaloi akciok es hibak merese,
- esemenynaplo alapvaltozata.

**Dontesi kapu:** a dobozos agent-epito (Fazis 4+) csak akkor kezdodjon, ha a Fazis 1-3
admin-slice bevalt a meglevo ugyfeleken - azaz merhetoen csokkent az adminisztracios terhet, es az
ugyfelek problemamentesen hasznaljak a feluletet.

### Fazis 4 - Onallo voice agent letrehozasa (csak validacio utan)

Cel: a mar hasznalt admin-portalra epulve az ugyfel maga hozhasson letre es szerkeszthessen egy
egyszerubb voice agentet.

Feladatok:

- `/portal/agents/new` uj agent letrehozasa.
- Agent alapadatok **iranyitott kerdoivvel**, nem szabad prompt-szerkesztovel:
  - megjeleno nev,
  - belso nev vagy slug,
  - bemutatkozas,
  - nyelv,
  - tegezodes/magazodas,
  - hangnem,
  - mukodesi cel,
  - nyitvatartas,
  - eszkalacios szabalyok,
  - tiltott temak,
  - alap gyakori kerdesek.
- Szekciokent mentheto beallitasok es draft allapot.
- Ures, betoltesi, validacios es mentett allapotok.
- Agent statusz megjelenitese: `draft`, `building`, `active`, `paused`.
- `agent.created` es `agent.settings.updated` esemeny az n8n fele.

Kesz, ha egy meglevo ugyfel Norbi kozbeavatkozasa nelkul vegig tud menni a kerdoivon es alap
beallitasokat tud menteni - ez az igazi jel arra, hogy a "maguk be tudjak allitani" feltevesez
realis.

### Fazis 5 - Agent aktivacio es alap teszteles

Cel: a felhasznalo ertse, mikor hasznalhato az agent.

Feladatok:

- Aktivacios elofeltetelek ellenorzese:
  - van agent alapbeallitas,
  - van legalabb egy kesz tudasbazis-forras,
  - van hozzarendelt telefonszam.
- `Agent epitesenek inditasa` muvelet.
- n8n webhook a voice agent konfiguracio eloallitasahoz/provisioninghoz.
- Agent statusz frissitese n8n callback alapjan.
- Egyszeru teszthivas vagy tesztelesi utmutato, a tenyleges voice stack kepessegei szerint.
- Aktiv, szunetelt es hibaallapotok kezelese.
- `agent.activation.requested` webhook.

Kesz, ha hianyos beallitassal nem indithato aktivacio, es az agent allapota vegigkovetheto a
portalon.

### Fazis 6 - Telnyx onkiszolgalo szamigenyles (csak ha Fazis 4-5 bevalt)

Cel: a mar admin-vezerelt Telnyx-folyamat (Fazis 2) onkiszolgalova alakitasa a validalt dobozos
agent-epitohoz.

Feladatok:

- Kivant orszag, korzetszam vagy szamtipus megadasa a kliens altal.
- Elerheto szamok listaja n8n/Telnyx valasz alapjan.
- Szam onallo igenylese vagy meglevo szam hozzarendelese a kliens altal.

Kesz, ha a felhasznalo a portalbol el tudja inditani az osszekotest onallo modon, es latja az
eredmenyt.

### Fazis 7 - Piacnyitas es stabilizalas (csak validacio utan)

Cel: a meglevo ugyfelkoron validalt dobozos agent-epito piacra vitele uj SMB-ugyfelek fele.

Feladatok:

- havidijas dobozos csomag es feluras egyedi workflow-tervezes ajanlat kidolgozasa,
- arazas piaci tesztelese (korai hozzaferes, presale logika),
- disztribucios csatorna kivalasztasa uj SMB-piacra,
- a kovetkezo funkciokrol csak valos hasznalat alapjan dontsunk: tobb felhasznalo es szerepkor,
  admin backoffice, riportok es hivasstatisztikak, ticketing, ertesitesi kozpont,
  Google-integraciok, billing, verziozott promptok, fejlettebb Telnyx szamkezeles.

## 6. Minimalis adatmodell

Az adatmodell mar a Fazis 0-1-ben felkeszul a kesobbi agent-epito retegre, hogy ne kelljen
migralni:

~~~text
users
organizations
org_members
projects
project_briefs
documents
phone_connections
~~~

A `projects` entitas a voice agent domain entitasa; a feluleten Fazis 1-ben "projektnek", Fazis
4-tol "Voice agentnek" nevezzuk - a mezok mar most ugy vannak kialakitva, hogy ez a nevvaltas ne
igenyeljen migraciot.

Fontos mezok:

- `projects`: `org_id`, `name`, `slug`, `agent_display_name`, `settings jsonb`, `status`,
  `phone_number`, `created_at`, `updated_at`.
  - a `status` mezo Fazis 1-ben egyszerubb ertekkeszlettel indul (pl. `onboarding`, `active`), es
    Fazis 4-tol bovul a `draft`/`building`/`active`/`paused` gepezetre.
- `project_briefs`: `project_id`, `answers jsonb`, `completed_sections`, `submitted_at`.
  - Fazis 1-ben ez tarolja az adminisztracios adatokat (pl. cegadatok, kapcsolattarto), Fazis
    4-tol az agent-kerdoiv valaszait is.
- `documents`: `org_id`, `project_id`, `file_name`, `storage_path`, `mime_type`, `size_bytes`,
  `processing_status`, `document_category`, `deleted_at`.
  - `document_category` mezo kulonbozteti meg Fazis 1-tol kezdve a dokumentumtipusokat
    (`utility_bill`, `id_document`, `knowledge_base`, `other`), hogy a kesobbi tudasbazis-specifikus
    logika (Fazis 1 vege / Fazis 4) ne igenyeljen ujra kategorizalast.
- `phone_connections`: `org_id`, `project_id`, `provider`, `phone_number`, `telnyx_number_id`,
  `status`, `last_error`, `connected_at`, `initiated_by` (`admin` vagy `client` - Fazis 2-ben
  mindig `admin`, Fazis 6-tol lehet `client`).

Az `settings` es `answers` JSONB Zod schemaval legyen validalva. A `settings` schema mar Fazis
0-1-ben korlatozott, kerdoiv-jellegu mezokeszletre keszuljon (nem szabad szoveges prompt-mezo),
hogy Fazis 4-ben ne kelljen az adatmodellt visszamenoleg atalakitani. Kulon mezot csak akkor
vezessunk be, ha az adatot tenylegesen szurni vagy listazni kell.

## 7. n8n webhook szerzodesek

Minden webhook szerveroldali titkos kulccsal, HMAC-SHA256 alairassal es idobelyeggel mukodjon. A
hibas n8n hivas ne tegye ervenytelenne a mar elmentett portal-adatot; az esemenyt naplozni es
ujraprobalni kell.

Portal -> n8n esemenyek (Fazis 1-2):

- `knowledge.file.uploaded`
- `knowledge.file.deleted`
- `phone.number.search_requested` (Fazis 2-ben admin altal inditva)
- `phone.number.connection_requested` (Fazis 2-ben admin altal inditva)

Portal -> n8n esemenyek (Fazis 4-6, csak validacio utan):

- `agent.created`
- `agent.settings.updated`
- `agent.activation.requested`
- `phone.number.search_requested` (Fazis 6-tol kliens is inditlathatja)
- `phone.number.connection_requested` (Fazis 6-tol kliens is inditlathatja)

Payload:

~~~json
{
  "event": "agent.settings.updated",
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

A handler ellenorizze az alairast, az idobelyeg frissesseget, az organization/project egyezest es
az esemeny idempotenciajat.

## 8. Biztonsagi minimum

- Magic linkes belepes, nyilvanos regisztracio nelkul.
- Minden Server Action es Route Handler session- es organization-jogosultsagot ellenoriz.
- A felhasznalo csak a sajat projektjeit, dokumentumait es telefonszam-kapcsolatait latja.
- A fajlok nem publikusak; letoltes csak rovid eletu signed URL-lel.
  - Ez kulonosen kritikus a Fazis 1-ben feltoltott erzekeny dokumentumoknal (kozuzemi szamla, ID,
    Google fiok hozzaferesi adatok) - egy publikusan elerheto fajl mar az elso ugyfelnel bizalmat
    rombolna.
- Tokenek, webhook titkok es Telnyx credentialok nem kerulnek kliensoldali env-be.
- Telnyx kulcsok csak n8n credential store-ban legyenek.
- MIME-type, fajlmeret es fajlnev validacio szerveroldalon is.
- Soft delete a dokumentumokra es projektekre/agentekre.
- Ne kerjunk Google jelszot vagy API-kulcsot a klienstol - ha a "Google fiok hozzaferes" dokumentum
  kategoriaba tartozo adat erzekeny (pl. jelszo), azt NE a portal fajlfeltoltojen keresztul kerjuk,
  hanem instrukciokent (pl. "ossza meg a Calendart ezzel az email cimmel"), es a tenyleges
  hozzaferest Norbi allitja be n8n/Service Account modon.

## 9. Javasolt PR-bontas

1. `codex/portal-foundation` - auth, adatbazis, portal shell, tenant guard
2. `codex/admin-document-upload` - dokumentumfeltoltes, fajllista, feldolgozasi statusz (Fazis 1)
3. `codex/admin-call-log-view` - call log es automatizacios adatok megjelenitese (Fazis 1)
4. `codex/telnyx-admin-flow` - telefonszam-dokumentumok feltoltese, admin-vezerelt igenyles allapot
   (Fazis 2)
5. `codex/voice-agent-management` - agent letrehozas, kerdoiv-alapu beallitasok, draft mentes
   (Fazis 4, csak validacio utan)
6. `codex/agent-activation` - elofeltetelek, provisioning, aktiv/szunetelt allapot (Fazis 5)
7. `codex/telnyx-self-service` - onkiszolgalo szamigenyles (Fazis 6)

Minden PR utan legyen futtathato build, migracio es legalabb a kritikus szerveroldali
ellenorzesekre unit teszt.

## 10. Sikerkriterium az elso szakaszhoz (Fazis 1)

Az elso szakasz akkor sikeres, ha:

- egy meglevo ugyfel belephet a portalra,
- fel tudja tolteni a szukseges dokumentumokat (kozuzemi szamla, EVNY-kivonat, tudasbazis-fajlok)
  email helyett a portalon,
- latja a call logot es az automatizaciobol erkezo adatokat,
- merhetoen csokken az email/hivas oda-vissza mennyisege a korabbi folyamathoz kepest,
- az adatok organization szinten el vannak kulonitve,
- a fontos muveletek n8n esemenykent tovabbithatok.

## Kovetkezo fejlesztesi lepes

Eloszor a `codex/portal-foundation`, majd a `codex/admin-document-upload` valosuljon meg. Az elso
merfoldko nem az onallo agent-letrehozas, hanem egy stabil admin-portal, ahol 1-2 meglevo ugyfel a
sajat fiokjaban toltheti fel a szukseges dokumentumokat es latja a call logot - email helyett. Ha
ez merhetoen csokkenti az adminisztracios terhet es az ugyfelek problemamentesen hasznaljak, akkor
epuljon ra a dobozos, onkiszolgalo agent-epito reteg (Fazis 4-tol), majd csak azutan a piacnyitas
uj SMB-ugyfelek fele.
