# HANDOFF.md

## Aktuális cél

A Meta lead hívó asszisztensek többűrlapos leadforrás-kezelésének külső ellenőrzése. A megvalósítás projektenként egy Facebook-oldalt és több Meta lead űrlapot kezel. A `20261005160000_add_meta_lead_sources.sql` migráció alkalmazási állapota ebben az átadásban nem lett ellenőrizve; cél Supabase projekt, migration history és felhasználói jóváhagyás nélkül ne alkalmazd.

## Feladat időmérő (2026-10-09)

- Belső, csak admin által látott Start/Stop időmérő a `/admin/tasks/[id]` oldalon (`task-timer.tsx`, `time-actions.ts`). Felhasználónként egyszerre egy futó időmérő (részleges egyedi index); új indításkor a korábbi automatikusan leáll. Az actionök ellenőrzik az admin szerepet, a feladat láthatóságát és a `superadmin_only` szervezetet; az ügyfélportál nem éri el (RLS be, `authenticated`-nak nincs jogosultsága, csak service-role).
- Új migráció, alkalmazva a `client-portal` projekten (2026-10-09, jóváhagyással): `supabase/migrations/20261009120000_add_task_time_entries.sql`. `anon`/`authenticated` jogosultság 0 visszaolvasva.
- Ellenőrzés: `npx tsc --noEmit --incremental false` sikeres. Böngészős teszt a migráció után szükséges (Start, Stop, másik feladaton indítás, superadmin_only feladat).

- Feladatrészletek oldalpanelként (2026-10-09): a listából/kanbanból a feladat jobb oldali kompakt panelben nyílik (Next.js intercepting route: `app/admin/tasks/layout.tsx`, `@modal/(.)[id]/page.tsx`, `@modal/default.tsx`, `@modal/page.tsx`); közvetlen URL-re/frissítésre a teljes oldal jön. A közös tartalom `[id]/task-detail.tsx`, felül soronkénti ceruzás (inline) szerkesztés: cím, státusz, prioritás, láthatóság, kezdő dátum, határidő, ügyfél, projekt, majd a leírás; alatta két fül: Időmérés, Előzmények (minden mentés az `updateTask` actionnel, a teljes értékkészlettel); törlés a fejlécben (superadmin). Esc/háttérkattintás/X bezár (`router.back()`). Ellenőrzés: `npm run build` és `tsc` sikeres; a bejelentkezés nélküli böngészőpanelben vizuális teszt nem futott, **bejelentkezett kézi teszt szükséges** (panel megnyitás, mentés, Start/Stop, törlés utáni visszatérés, frissítés a panelen).

- Lista nézet (2026-10-09/10): új kliens komponens `app/admin/tasks/task-list.tsx`. Alapból csak a „Tennivaló” szekció nyitott, a többi zárt; mind a hét státusz látszik (üresek is). A státuszmódosító legördülő megszűnt, helyette a sorok húzhatók (drag and drop) másik státusz szekcióra (`moveTask` action, optimista frissítés, hibánál visszaállás); húzás közben a zárt szekció kinyílik. Archiválás a feladat panelen van. A feladat panel „Felelős” sorral bővült (`updateTask` kezeli, admin-ellenőrzéssel és naplózással). Bejelentkezett kézi teszt szükséges.

- Naptár nézet (2026-10-10): új `view=calendar` a feladatoldalon (`app/admin/tasks/task-calendar.tsx`): havi rács (hétfői kezdéssel), a feladatok a határidő napján, prioritás szerinti színezéssel; napi legfeljebb 3 chip + „+N további”; a határidő nélküliek alul listázva; az archivált feladatok rejtve. A chipek a feladat panelt nyitják. Később bővítve: „+N további” kattintásra kinyitja a napot; Hónap/Hét váltó (heti nézetben minden feladat látszik); feladat húzása másik napra a határidőt módosítja (`moveTaskDueDate` action: admin- és superadmin_only-ellenőrzés, kezdő dátum előtti határidő tiltva, aktivitásnapló `calendar_drag` forrással); a határidő nélküliek is ráhúzhatók egy napra. Az aktív szűrők érvényesek. A lista és a kanban kártyákon megjelent a felelős neve. Bejelentkezett kézi teszt szükséges.

- Fejléc időmérő (2026-10-10): az admin layout lekéri a belépett admin futó időmérőjét (`getRunningTimer`), és a `DashboardHeader`-ben megjeleníti (`app/admin/header-timer.tsx`: feladatcím-link, élő számláló, Stop). A Start/Stop a teljes `/admin` layoutot revalidálja. **Nincs commitolva/deployolva.**

- Időnyilvántartás / timesheet (2026-10-10): új oldal `/admin/timesheet` (menü: Időnyilvántartás, `canViewProjects` jogosultsággal): heti tábla feladatonként × napokonként, napi és heti összesítés 8 órás sávval, hét/hónap váltó (`period=month`, `date` az időszak kezdő napja; havi nézetben a teljes hónap egy vízszintesen görgethető táblában, egyszerre 15 nap látszik (CSS container query egységekkel), rögzített első és utolsó oszlop), hét/hónap lapozás, „Hétvége elrejtése”, feladatsoronként lenyitható időpontok (`timesheet-task-rows.tsx`: kezdés–vége és időtartam a nap oszlopában), „Bejegyzések” nézet. Felhasználóválasztó (legördülő a szűrősorban, a CSV export mellett, a Szűrés gombbal lép életbe): Saját (alapérték) / Mindenki / egy adott admin — a superadmin mindenkit lát, az admin a sajátját és a többi adminét, a superadmint nem (a láthatósági lista szerveroldalon készül, az `user` paraméter csak ebből választhat; „Mindenki” nézetben felhasználónkénti csoportosítás és részösszeg); a napokra bontás Europe/Budapest szerint, a több napot átívelő bejegyzés a kezdő napjához számít. Logika: `lib/timesheet.ts`, teszt: `tests/timesheet.test.ts` (13/13). A fejléc időmérő és ez a nézet **nincs commitolva/deployolva**; bejelentkezett kézi teszt szükséges.

- Időbejegyzések utólagos szerkesztése/törlése (2026-10-10): a feladat Időmérés fülén a saját, lezárt bejegyzéseknél ceruza (nap, -tól, -ig) és kuka (`updateTimeEntry`, `deleteTimeEntry` a `time-actions.ts`-ben). Időpontok Europe/Budapest szerint (`budapestDateTime` a `lib/timesheet.ts`-ben, DST-tesztelt, `npm test` 14/14); szabályok: csak saját, nem futó bejegyzés; vége a kezdés után, azonos napon belül; nem lehet jövőbeli. Nincs naplózva és nincs átfedés-ellenőrzés. Nincs commitolva/deployolva.

- Időnyilvántartás adatpontosság (2026-10-10): (1) kézi időrögzítés a feladat Időmérés fülén („Idő hozzáadása”, `addTimeEntry`); (2) az éjfélt átívelő bejegyzések a timesheetben budapesti napokra bontva számolnak (`splitByDay` a `lib/timesheet.ts`-ben; a szerkesztő továbbra is azonos napon belüli időszakot enged); (4) átfedés-ellenőrzés hozzáadáskor és szerkesztéskor (`overlapsOther`, a futó bejegyzés a mostanig tart; a Start nem ellenőriz). `npm test` 16/16, tsc sikeres. Nincs commitolva/deployolva; bejelentkezett kézi teszt szükséges.

- Időnyilvántartás riportok (2026-10-10): közös adatréteg `lib/timesheet-data.ts` (láthatóság, szűrők, napokra bontás); új „Összesítés” nézet (ügyfél → projekt → feladat, idő és arány); szűrők ügyfélre/projektre/feladat státuszra (GET űrlap, minden nézetre érvényes); az ügyfél/projekt szűrő összekapcsolt (`app/admin/customer-project-filter.tsx`, a feladatoldal szűrője is ezt használja): ügyfél választása a projektlistát szűkíti, projekt választása beállítja és leszűkíti az ügyfelet; CSV export: `/admin/timesheet/export` (UTF-8 BOM, `;` elválasztó, tizedesvessző, képletinjekció-védelem, ugyanaz a jogosultság/láthatóság mint az oldalon). Nincs commitolva/deployolva; bejelentkezett kézi teszt szükséges.

- Deploy (2026-10-10): a feladatkezelő/időnyilvántartás csomag (`114b76b` + a következő commit) a `master`-re pusholva; a felhasználó kérésére a `tests/timesheet.test.ts` **nincs commitolva** (helyben létezik, 16/16 sikeres), a deploy előtt tesztfuttatás nem történt. Adatot nem másoltunk, éles adatbázis-módosítás nem volt (a `task_time_entries` migráció korábban alkalmazva). A helyi tesztadatok sorsáról a felhasználó még nem nyilatkozott; tesztadat-takarítás csak kifejezett jóváhagyással.

## Feladat projekt nélkül (2026-10-06)

- Az admin feladatűrlap (`app/admin/tasks/new-task-form.tsx`) és a szerkesztő most **Ügyfél** (kötelező) + **Projekt** (opcionális, az ügyfél projektjeire szűrve, „Projekt nélkül” alapérték) mezőt használ. A szerver (`resolveTaskScope` az `actions.ts`-ben) újraellenőrzi az ügyfelet, a projekt-ügyfél egyezést és a `superadmin_only` szervezet láthatóságát. `getProjectManagementData` új `customers` listát ad; projekt nélküli feladat neve „Projekt nélkül”; az e-mail értesítés ilyenkor kihagyja a Projekt sort.
- Az értesítésekből indított feladatűrlap (`app/admin/notifications/notification-task-form.tsx`) is megkapta az Ügyfél + opcionális Projekt mezőket (az ügyféllista a projektekből származik, így projekt nélküli ügyfél itt nem választható).
- Új migráció, a felhasználó jóváhagyásával alkalmazva a `client-portal` projekten (`db query --linked -f` + `migration repair`; `project_id` `is_nullable = YES` visszaolvasva): `supabase/migrations/20261006120000_allow_tasks_without_project.sql` (`tasks.project_id` nullable).
- Ellenőrzés: `npx tsc --noEmit --incremental false` sikeres. Böngészős teszt a migráció alkalmazása után szükséges (projekt nélküli létrehozás, szerkesztés projektre és vissza, szűrők).

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
- Kézi teszt 2026-10-06 (superadmin, `convertedweb@gmail.com`, Chrome): jóváhagyással létrejött a „ConvertedWeb – TESZT – Meta lead hívó” projekt (ConvertedWeb szervezet, `edc7c8e1-1220-4a27-9c13-882683b2ea76`) kitalált adatokkal (Page ID `900000000000001`, Form ID `…101` aktív, `…102` soft deleted). Működött: oldalkapcsolat mentése, két űrlap hozzáadása, szüneteltetés, visszakapcsolás, soft delete, duplikált Form ID hibaüzenete; az `activity_logs` rögzítette az eseményeket. A tesztprojekt a felhasználó döntése szerint megmarad.
- RLS-ellenőrzés 2026-10-06 (szerepkör-szimuláció, `set local role authenticated` + JWT claim, visszagörgetett tranzakcióban; nincs maradék adat): a tesztszervezet `superadmin_only`. A két normál admin 0 sort lát mindkét táblán; az ügyfél (`client_member`) 1–1 sort lát; egy nem kapcsolódó user 0-t. Mind a négy szerepkörnél az INSERT és UPDATE `42501` (permission denied) hibával tiltott. Nem lett tesztelve: normál admin olvasása nem `superadmin_only` szervezet Meta projektjén (nincs ilyen), valamint bejelentkezett böngészős ellenőrzés normál admin/ügyfél sessionnel; a server action superadmin-ellenőrzését csak kódszinten néztem meg.
- n8n (2026-10-06): a felhasználó élő workflow-ja (`n8n/Lead Call - online 30 perc.json`, nem követett) Facebook Lead Ads triggerrel indul, Google Sheet/Calendar/Gmail + ElevenLabs hívás. Megállapítások: (1) a `Retryable call failure?` csomópontnak nincs bejövő kapcsolata, az újrapróbálkozási ág valószínűleg halott (élő n8n-ben ellenőrizendő); (2) a `saveIntake` és `checkAvailability` webhook nem hitelesített. A lead-adatokat a felhasználó döntése szerint nem tároljuk adatbázisban; riportok az ElevenLabs kivonataiból/hangfelvételeiből készülnek.
- Weboldal-űrlap belépési pont: új export `n8n/Lead Call - online 30 perc - weboldal.json` (az eredeti változatlan), leírás: `docs/website-lead-webhook.md`. Új `POST /webhook/website-lead` (fejléces titok `WEBSITE_LEAD_WEBHOOK_SECRET`, hozzájárulás, telefon- és e-mail-validáció, honeypot, napi duplikációszűrés, Sheet-sor létrehozása), majd a meglévő `Normalize Sheet Lead` láncra köt; a `source` mező `website_form`. A kódcsomópontokat helyi harnessben teszteltem; az n8n-be importálás és élő teszt még nem történt meg. - Portál weboldal-űrlap forrás (2026-10-06, migráció alkalmazva): a `lead_sources` kapott `source_type` (`meta_form`/`website_form`) és `website_url` oszlopot, a `meta_form_id` és `integration_connection_id` nullable lett, check constraint tartja a két típus mezőit, és projektenként egyedi az aktív weboldal-URL. Migráció: `supabase/migrations/20261006100000_add_website_lead_sources.sql`, a felhasználó jóváhagyásával alkalmazva a `client-portal` projekten (`db query --linked -f` + `migration repair --status applied`). A „Lead űrlapok” fülön a superadmin Facebook-oldal nélkül is adhat hozzá weboldal-űrlapot (név + normalizált oldal-URL, `lib/lead-sources.ts`), szüneteltethet és leválaszthat; az aktivitásnapló `website_lead_source_*` eseményeket kap. Titkot a portál nem tárol. Ha a migráció hiányzik, a lekérdezés `42703` hibája a „migráció még nincs alkalmazva” üzenetet mutatja a teljes fülön, ezért a migráció már alkalmazva van. Ellenőrzés: `npm test` 7/7, tsc és build sikeres; superadmin böngészős teszt (felvétel normalizált URL-lel, duplikált URL elutasítása, szüneteltetés, visszakapcsolás, soft delete) sikeres, naplóesemények rögzítve; visszagörgetett tranzakcióban a constraintek (weboldal+Form ID, weboldal URL nélkül, Meta kapcsolat nélkül) tiltanak, soft delete után ugyanaz az URL újra felvehető. A tesztforrás (`https://teszt-oldal.example.com/kapcsolat`) soft deleted állapotban maradt.
- Következő konkrét lépés (a már elvégzett superadmin rész kivételével): valódi superadminnal ellenőrizd az oldal- és többűrlapos CRUD-folyamatot, normál adminnal az írás tiltását, ügyféllel az RLS szerinti saját projektes olvasást, továbbá a soft delete-et és a duplikált Meta Form ID hibáját. Deploy előtt kérdezz rá a helyi tesztadatok sorsára az `AGENTS.md` szerint.

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
