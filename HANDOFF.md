# HANDOFF.md

## Aktuális cél

A Meta lead hívó asszisztensek többűrlapos leadforrás-kezelésének külső ellenőrzése. A megvalósítás projektenként egy Facebook-oldalt és több Meta lead űrlapot kezel. A `20261005160000_add_meta_lead_sources.sql` migráció alkalmazási állapota ebben az átadásban nem lett ellenőrizve; cél Supabase projekt, migration history és felhasználói jóváhagyás nélkül ne alkalmazd.

## Claude Code handoff – Meta lead források (2026-10-05)

- A `meta_lead_caller` projektek új „Lead űrlapok” fület kaptak az admin- és ügyféloldali projektnézetben.
- Új adatmodell: `integration_connections` projektenként egy aktív provider-kapcsolattal, valamint `lead_sources` több Meta Form ID tárolására. Mindkét tábla tenant-kompozit idegen kulcsot, soft delete-et, RLS-t és csak olvasási `authenticated` jogosultságot kap; írás a szerveroldali admin kliensen keresztül történik.
- A kliensfelület megmutatja a kapcsolt Facebook-oldalt, az aktív/összes űrlapszámot és a legutóbbi lead időpontját. A superadmin oldalkapcsolatot menthet, űrlapot adhat hozzá, szüneteltethet, visszakapcsolhat és soft-delete-tel leválaszthat.
- A server actionök újraellenőrzik a superadmin jogosultságot, a `meta_lead_caller` kategóriát, az `organization_id`/`project_id` határt és a `deleted_at is null` feltételt; a műveletek aktivitásnaplóba kerülnek.
- Érintett fájlok: `app/admin/projects/[id]/page.tsx`, `app/portal/agents/[id]/page.tsx`, `app/portal/agents/[id]/project-tabs.tsx`, `app/portal/agents/[id]/meta-lead-actions.ts`, `app/portal/agents/[id]/meta-lead-sources-panel.tsx`, `lib/meta-leads.ts`, `app/globals.css`, valamint `supabase/migrations/20261005160000_add_meta_lead_sources.sql`.
- Ellenőrzés 2026-10-05: `npm test` 5/5 sikeres; `npm run build` sikeres, 27 oldal; `npx tsc --noEmit --incremental false` sikeres; a migráció SQL-jének statikus jogosultsági és tenant-határ ellenőrzése megtörtént. Külső Supabase-migráció és bejelentkezett kézi teszt nem futott.
- Szándékosan kihagyandó, nem követett helyi tartalom: `.claude/launch.json` és `public/ads/*.png`. Ezek nem részei ennek a fejlesztésnek, ne stage-eld őket automatikusan.
- Olvasási ellenőrzés 2026-10-05 (`npx supabase migration list --linked`): a felhasználó megerősítette, hogy a kapcsolt `client-portal` projekt a cél (a helyi `.env.local` is ugyanerre mutat, valószínűleg éles). Remote: `20260930120000` alkalmazva; a percdíj migráció `20261005155200` remote verzióval szerepel (az oszlop létezik); `20261005160000_add_meta_lead_sources` **nincs alkalmazva** (`lead_sources` és `integration_connections` hiányzik). Migráció nem futott.
- 2026-10-05: a felhasználó jóváhagyásával a `20261005160000` migráció alkalmazva a `client-portal` projekten (`npx supabase db query --linked -f`, majd `migration repair --status applied`). Visszaolvasás: mindkét tábla létezik, RLS be van kapcsolva, egy-egy SELECT policy van, `anon`-nak nincs jogosultsága, `authenticated`-nak csak SELECT. Adatot nem hoztam létre.
- Következő konkrét lépés: valódi superadminnal ellenőrizd az oldal- és többűrlapos CRUD-folyamatot, normál adminnal az írás tiltását, ügyféllel az RLS szerinti saját projektes olvasást, továbbá a soft delete-et és a duplikált Meta Form ID hibáját. Deploy előtt kérdezz rá a helyi tesztadatok sorsára az `AGENTS.md` szerint.

## Claude Code handoff (2026-10-05)

- Git: az átadás előtti HEAD és `origin/master` egyaránt `e00a6e2` (`feat: calculate monthly voice usage cost`). A jelen dokumentációs handoff külön helyi commitba kerül; push nem történik.
- A legutóbbi fejlesztés projektenként opcionális, nemnegatív `minute_rate_huf` mezőt, Europe/Budapest időzóna szerint csoportosított havi híváshasználatot és tört percekkel számolt HUF-költséget ad a portálhoz.
- A `null` percdíj „nincs beállítva”, a `0` valódi nulla díj. A hónapok pontos másodperceket őriznek, és az aktuális hónap hívás nélkül is megjelenik.
- Új, append-only migráció: `supabase/migrations/20261005124746_project_minute_rate_huf.sql`. Külső adatbázison nem futott ellenőrzés ebben a handoffban, ezért az alkalmazási állapot ismeretlen.
- Közvetlen előzmények: superadmin feladat-soft-delete (`73d7a40`), portál dashboard/task board UI-frissítés (`84ded68`), portál email-értesítések és admin finomítások (`e2d84c5`).
- Ellenőrzés 2026-10-05: `npm test` 5/5 sikeres; `npm run build` sikeres, 27 oldal; a build saját típusellenőrzése és az utána szekvenciálisan futtatott `npx tsc --noEmit --incremental false` sikeres. A builddel párhuzamos első külön `tsc` a közben újragenerált `.next/types` miatt hibázott, majd tisztán átment.
- Szándékosan kihagyott, tulajdonjog szempontjából bizonytalan nem követett fájlok: `.claude/launch.json` és `public/ads/*.png`. Ezeket ne stage-eld automatikusan.
- Következő konkrét lépés: olvasási módban azonosítsd a cél Supabase projektet és ellenőrizd a migration historyt. A felhasználó kifejezett jóváhagyása után alkalmazd a szükséges migrációt, majd ellenőrizd a havi használatot és költséget beállítatlan, nulla és pozitív percdíjjal, hívás nélküli hónappal, valamint budapesti hónapfordulónál. Deploy előtt kérdezz rá a helyi tesztadatok sorsára az `AGENTS.md` szerint.

## Meta lead hívó asszisztens kategória (2026-09-30)

- Új `meta_lead_caller` projektkategória és magyar címke került a közös projekttípusokba.
- Az ügyfélportál újprojekt-varázslója külön Meta lead kártyát és négylépéses, kimenő hívásra/Google Calendarra szabott szövegezést kapott.
- A Meta lead kategória a voice agenthez hasonlóan kezeli az asszisztensnevet, telefonszám-igénylést, Telnyx státuszt, Google-hozzáférést és admin teendőket.
- Az admin ügyféloldali projektlétrehozó és a projekt szerkesztője elfogadja az új kategóriát.
- A portál projektlistája és navigációja a voice agenteket és Meta lead hívókat közösen „Telefonos asszisztensek” alatt jeleníti meg.
- Új, még nem alkalmazott migráció: `supabase/migrations/20260930120000_add_meta_lead_caller_project_category.sql`; ez bővíti a `projects_category_check` constraintet.
- Ellenőrzés 2026-09-30: `npm test` 2/2 sikeres; `npx tsc --noEmit --incremental false` sikeres; `npm run build` sikeres, 27 oldal; `git diff --check` sikeres.
- Böngészős smoke: aktív ügyfél-sessionnel az új kategória megjelent, kiválasztható volt, és a Meta-specifikus négylépéses onboarding helyesen renderelődött. A beküldést szándékosan nem végeztem el, hogy ne jöjjön létre tesztadat a kapcsolt adatbázisban.
- Következő konkrét lépés: a cél Supabase projekt és a helyi/éles tesztadat-kezelés felhasználói megerősítése után alkalmazd a migrációt, majd hozz létre egy teszt Meta lead projektet és ellenőrizd admin- és ügyféloldalon. Ezután lehet push/deploy; push és deploy eddig nem történt.

## Átadás Codexnek (2026-09-30)

- Git: `master`, a legutóbbi három commit (`2fdb24c`, `561a533`, `34787a0`) helyben van, **nincs pusholva és nincs deployolva**. Deploy előtt kötelező rákérdezni a helyi tesztadatok sorsára (lásd AGENTS.md).
- Nem commitolt, szándékosan kihagyott fájlok: `next-env.d.ts` (a dev szerver generálta, ne szerkeszd kézzel), `.claude/launch.json` (helyi preview-konfiguráció).
- A helyi dev szerver a 3000-es porton fut; ha a CSS nem töltődik be, állítsd le, töröld a `.next-dev` mappát és indítsd újra.
- Az új `start_date` migráció a kapcsolt (valószínűleg éles) Supabase projekten már alkalmazva van; a helyi és az éles app ugyanazt az adatbázist használja.
- Még nem volt kézi, bejelentkezett böngészős teszt: új feladat létrehozása felelőssel/státusszal/kezdő dátummal, szerkesztés, lista nézet dátumtartomány, megszemélyesítés.
- Javasolt következő lépések: kézi teszt fent; ESLint bekötése (új devDependency, jóváhagyás kell); becsült idő, címkék, checklist mezők; security advisor figyelmeztetések.
- A fenti bekezdés a megszemélyesítés/feladatfejlesztés korábbi átadása. A legfrissebb munkafolyam a `Meta lead hívó asszisztens kategória (2026-09-30)` szakaszban van.

## Feladatűrlap-bővítések (2026-09-29)

- Új feladat űrlap: **Felelős** (alapértelmezés a bejelentkezett admin), **Kezdeti státusz** (alapértelmezés `backlog`) és **Kezdő dátum** mező. A `createTask` „Kész” kezdeti státusznál `completed_at`-et is állít.
- Kezdő dátum: új `tasks.start_date date` oszlop (`20260929120000_add_task_start_date.sql`), a szerkesztőoldalon és a lista nézetben is megjelenik; a szerver ellenőrzi, hogy nem későbbi a határidőnél; a változás bekerül az aktivitási naplóba.
- A migrációt a felhasználó jóváhagyásával célzottan futtattam a kapcsolt Supabase projekten (`supabase db query --linked -f`), majd `migration repair --status applied 20260929120000`. Az oszlop létezik (date, nullable).
- Tervezett további mezők (még nincsenek): becsült idő, címkék, checklist, kategória, ismétlődés, csatolmány, függőség.

## Legutóbbi fejlesztés (2026-09-29)

- A superadmin a Felhasználók oldalon admin- vagy ügyfélfiókhoz egyszer használható, 10 percig érvényes belépési linket készíthet. Superadmin célfiók megszemélyesítése tiltott.
- A link létrehozását szerveroldali szerepkör-ellenőrzés, normalizált célútvonal és SHA-256 tokenlenyomat védi; a nyers token nem kerül adatbázisba.
- Az `/auth/impersonate/[id]` route atomikusan elfogyasztja a sessiont, Supabase OTP-vel belépteti a célfelhasználót, majd httpOnly megszemélyesítési cookie-t állít be.
- Az admin- és portállayout figyelmeztető sávban jelzi az aktív megszemélyesítést; kijelentkezéskor a cookie is törlődik.
- Az admin naplóoldal külön listázza a megszemélyesítési sessionöket és azok állapotát.
- Az új `impersonation_sessions` tábla RLS-sel védett, az `anon` és `authenticated` szerepkörök közvetlen hozzáférése vissza van vonva; a hozzáférés csak szerveroldali admin kliensen keresztül történik.

## Legutóbbi kiadás (2026-09-27)

- Pénzügyi admin felület (`/admin/finance`): ügyfélszámlák, havi díjtervek és várható bevételek. Új migrációk: `20260926190122`, `20260926191139`, `20260926191639`, `20260927114047`.
- Feladatoknál új `todo` státusz, nézet- és dátumkezelési finomítások; új migráció: `20260927160342`.
- A pénzügyi táblák kilenc RLS policyját a `20260927184551_secure_financial_visibility.sql` tranzakciósan szűkíti: a normál admin csak nem `superadmin_only` szervezet sorait olvashatja és módosíthatja. A production módosítás a felhasználó kifejezett jóváhagyásával történt, a Supabase historyban `20260927184914` verzióval szerepel. A régi policy-definíciók a fenti korábbi migrációkban szerepelnek; a módosítás adatot nem törölt.
- GitHub Actions build: `36341751610`, sikeres. Éles image: `ghcr.io/convertedweb/convertedai-portal:4acbcd2f3aa090a27e8dfbe18928e5aab2d308e6` a `/opt/convertedai-portal` Compose stackben. A korábbi `13f88f7053fd563f37142b0a12c402b351e6bc66` image tag rollbackhoz ismert. A Caddy/n8n stack változatlan.
- A távoli Supabase migrációtörténet ugyanazokat a pénzügyi/feladat sémaváltozásokat más időbélyeggel tartalmazza, mint a helyi fájlok. Emiatt későbbi `supabase db push` előtt a historyt tudatosan egyeztesd; ezeket a migrációkat ne alkalmazd újra.

## Elkészült

- Projektmenedzsment adatmodell és RLS-migrációk:
  - projekttagok, taskok, task kommentek alapja;
  - `internal`, `client_visible`, `superadmin_only` feladatláthatóság;
  - belső és ügyfélprojektek tenant-izolációja;
  - superadmin-only ügyfelek és a kapcsolódó láthatósági policyk.
- Admin Feladatok felület:
  - Kanban- és listanézet;
  - drag-and-drop státuszváltás optimista UI-val és hibánál visszaállítással;
  - külön szerkesztőoldal;
  - prioritászászlók és státuszszínű kártyaszegélyek;
  - kompakt, ikonról nyitható szűrőpanel kereséssel, ügyfél-, projekt-, státusz-, prioritás-, felelős- és határidőszűréssel;
  - „Saját feladataim” nézet, URL-ben megőrzött szűrők és aktív szűrőszámláló.
- Feladataktivitási előzmények:
  - feladatonkénti idővonal az `activity_logs` adataiból;
  - létrehozó, időpont, ticket/értesítés eredet és státuszváltozások;
  - új módosításoknál cím, leírás, projekt, státusz, prioritás, láthatóság és határidő előtte/utána értékei;
  - régi feladatoknál szintetikus létrehozási esemény, ha nincs korábbi task-log.
- Admin értesítési oldal a `/admin/notifications` útvonalon:
  - support- és projektértesítések;
  - értesítésből feladat létrehozása névvel, projekttel, felelőssel, prioritással és határidővel;
  - a létrehozott feladatok tartós „Feladat létrehozva” jelölése stabil kulccsal, régi adatoknál cím+leírás visszafelé kompatibilis felismeréssel;
  - a jelölés csak a tényleges forrásértesítésen jelenik meg.
- Support routing:
  - `general` és `billing` téma normál adminhoz, más témák elsődlegesen superadminhoz kerülnek;
  - szükség esetén szervezetenként belső `Ügyféltámogatás` projekt készül;
  - kézi ticket→task művelet és automatikus task létrehozás.
- Ügyfél- és projektszabályok:
  - „Csak én látom” ügyfélkapcsoló létrehozásnál és szerkesztésnél;
  - ügyféllistában zárt/nyitott lakatos láthatósági oszlop;
  - `ui_ux_design` és `website` kategóriák, csak superadmin számára;
  - ezeknél nincs agentnév-, telefon- vagy Google-hozzáférés mező.
- Navigáció és felületi szövegek:
  - admin menüpont és oldalcím: `Feladatok`;
  - ügyféloldali brand: `Ügyfél Portál`, admin brand: `Ügyfél Portál Admin`;
  - ügyféloldalon a Tudásbázis és Integrációk menük rejtve;
  - admin harang külön értesítési oldalra mutat.
- Auth javítások:
  - TokenHash-alapú magic-link sablon dokumentálva;
  - helyi és production callback URL-ek;
  - hibás `/auth/confirm&...` URL-ek middleware-kompatibilitási javítása;
  - duplikált email-sablontartalom megszüntetéséhez frissített sablon.
- A superadmin Supabase Auth megjelenítési neve `Norbi` lett (külső állapotváltozás, nem repófájl).
- A generált `tsconfig.tsbuildinfo` és `supabase/.temp/` bekerült a `.gitignore`-ba.

## Érintett fő területek

- `app/admin/users/`, `app/auth/impersonate/`, `lib/impersonation.ts`
- `app/impersonation-banner.tsx`, `app/admin/layout.tsx`, `app/portal/layout.tsx`, `app/auth/signout/route.ts`
- `app/admin/logs/page.tsx`, `app/globals.css`
- `supabase/migrations/20260927193155_add_impersonation_sessions.sql`
- `app/admin/tasks/`, `lib/project-management.ts`, `app/globals.css`
- `app/admin/notifications/`, `app/admin/layout.tsx`, `lib/tasks.ts`
- `app/portal/support/`, `app/admin/messages/`, `lib/support.ts`
- `app/admin/customers/`, `lib/admin-data.ts`
- `lib/project-types.ts`, projektlétrehozó és projektoldalak
- `app/login/page.tsx`, `app/auth/confirm/route.ts`, `middleware.ts`, `README.md`
- `supabase/migrations/20260925*.sql` és `supabase/migrations/20260926*.sql`

## Következő konkrét lépések

1. A migráció alkalmazása előtt egyeztesd a cél Supabase projektet és annak migration historyját. Éles adatbázis-módosítás csak kifejezett jóváhagyással történhet.
2. A migráció után valódi superadminnal készíts linket külön normál admin- és ügyfélfiókhoz, majd privát böngészőablakban ellenőrizd a céloldalt, a figyelmeztető sávot és a kijelentkezést.
3. Ellenőrizd, hogy lejárt, már felhasznált, hibás és superadmin célú link nem használható, valamint hogy normál admin közvetlenül nem tud sessiont készíteni vagy olvasni.
4. Ellenőrizd az admin naplóoldalon a létrehozott, felhasznált és lejárt sessionök megjelenését; szükség esetén dönts a régi sessionök későbbi takarításáról.
5. Valódi superadmin, normál admin és ügyfél fiókkal teszteld a pénzügyi képernyőket és a közvetlen Supabase Data API-t. A normál admin nem kaphat `superadmin_only` szervezethez tartozó számla-, díjterv- vagy bevételsort, és nem írhat ilyet.
6. Vizsgáld meg a Supabase security advisor három figyelmeztetését: `admin_customer_members` SECURITY DEFINER függvény [anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) és [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) szerepkörből hívható; a [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ki van kapcsolva. A jogosultságok változtatása előtt ellenőrizd a függvény tényleges használatát.
7. Állíts be nem interaktív ESLint konfigurációt (ehhez `eslint` + `eslint-config-next` devDependency kell — döntés a felhasználóra vár). A tesztfuttató kész: `npm test` (lásd alább).

## Fontos döntések

- A taskok projekthez és szervezethez is kötődnek; összetett foreign key védi a tenant-határokat.
- A service-role kliens minden érzékeny művelet előtt alkalmazásszintű szerepkör- és láthatóság-ellenőrzést kap, mert megkerüli az RLS-t.
- A szűrők URL query paraméterekben vannak, ezért frissítés és nézetváltás után is megmaradnak. A szűrőpanel alkalmazás után bezáródik.
- Az értesítés→task állapot az aktivitáslog metaadatában stabil `notificationKey` értékkel marad meg; a korábban létrehozott taskok cím+leírás fingerprint alapján ismerhetők fel.
- Az aktivitási idővonal a meglévő `activity_logs` táblát használja, ezért nem kellett új migráció. Az új `task_updated` események mezőszintű `changes` metaadatot kapnak.
- A magic-link sablon első query paramétere előtt `?` szükséges. A middleware csak visszafelé kompatibilitási védőháló a korábbi hibás `&` formára.
- A meglévő n8n/Caddy stacken tilos `docker compose down -v`; célzott service-frissítés és Caddy reload szükséges.

## Ellenőrzés

- 2026-09-29 (később): új `npm test` script (`scripts/run-tests.mjs`) tsc-vel fordítja a teszteket és `node --test`-tel futtatja; Node 20-on is működik, 2/2 teszt sikeres.
- 2026-09-29: `npm run build` sikeres, az új `/auth/impersonate/[id]` route-tal együtt 27 oldal generálva.
- 2026-09-29: `npx tsc --noEmit --incremental false` sikeres.
- 2026-09-29: `git diff --check` sikeres.
- 2026-09-29: `npm run lint` nem futott le érdemben, mert a projekt `next lint` parancsa továbbra is interaktív ESLint-beállítást kér.
- 2026-09-29: a teljes TypeScript tesztcsomag nem futott; a helyi Node `v20.19.5`, a repó tesztparancsa Node 22.6+ `--experimental-strip-types` támogatását igényli.
- Bejelentkezett, szerepkörös böngészős teszt és a migráció külső Supabase projekten való kipróbálása még nem történt meg.
- 2026-09-27: `npm run build` sikeres, 27 oldal generálva; `npx tsc --noEmit --incremental false` sikeres a build után. A builddel párhuzamos első TS-futás a generálódó `.next/types` miatt versenyhelyzetben hibázott, ismétléskor tiszta volt.
- Auth URL tesztek: 2/2 sikeres (TypeScript külön fordítással futtatva a jelenlegi Node környezetben).
- GitHub Actions image build sikeres; a production konténer `healthy`, az image SHA megfelel a kiadott commitnak.
- Production RLS visszaolvasás: mindhárom pénzügyi táblán a SELECT, INSERT és UPDATE policy tartalmazza a `superadmin_only` szervezeti korlátozást.
- Külső smoke: `https://portal.convertedweb.com/api/health` 200; `/admin/finance` 307 a bejelentkezésre; `https://app.convertedweb.com/` 200.
- `git diff --check` sikeres; célzott titokmintakeresés nem talált credentialt a kiadott kódban.
- `npx tsc --noEmit --incremental false`: sikeres 2026-09-26.
- `npm run build`: sikeres 2026-09-26; fordítás, típusellenőrzés és 26 oldal generálása rendben.
- Csak olvasási Supabase ellenőrzés: `activity_logs` JSON `taskId` szűrés sikeres (`activity-filter-ok rows=1`).
- `git diff --check`: sikeres.
- Titokminták célzott keresése nem talált commitolandó credentialt.
- `npm run lint`: 2026-09-27-én sem futott le érdemben, mert a projekt jelenlegi `next lint` parancsa interaktív ESLint-beállítást kér.
- `node --test --experimental-strip-types tests/*.test.ts`: a jelenlegi Node 20 környezetben nem fut (`--experimental-strip-types` Node 22.6+ szükséges).
- Böngészős, bejelentkezett admin ellenőrzés nem történt meg, mert a helyi in-app böngészőben nem volt aktív admin session.

## Ismert kockázatok és megjegyzések

- A megszemélyesítési funkció csak a migráció alkalmazása után működik. A migration history eltérései miatt ne futtass vakon `supabase db push` parancsot.
- A session már az OTP-ellenőrzés előtt elfogyasztásra kerül; egy sikertelen vagy megszakadt beváltás után új linket kell készíteni. Ez csökkenti az újrajátszás kockázatát, de kézi UX-ellenőrzést igényel.
- A megszemélyesítés a célfelhasználó valódi Supabase sessionjét hozza létre; a figyelmeztető cookie csak a felületi jelzéshez és az audit-kontextushoz szolgál. A célfiók jogosultságait ezért minden route-on a normál alkalmazásszabályoknak kell korlátozniuk.
- A lokális migrációfájlok és a kapcsolt Supabase projekt historyjának időbélyegei eltérnek; nem biztonságos vakon `supabase db push` parancsot futtatni.
- A build, RLS-szabályellenőrzés és nyilvános smoke sikeres; bejelentkezett szerepkörös, tenant-határos kézi integrációs teszt még hiányzik.
- A Supabase security advisor három, az RLS-módosítástól független figyelmeztetést mutat; lásd a következő lépéseket.
- A régi aktivitásbejegyzések nem tartalmaznak minden mezőhöz előtte/utána értéket; a részletes változáslista az új mentésektől kezdve teljes.
- A generált `supabase/.temp/` és `tsconfig.tsbuildinfo` nincs commitolva.
