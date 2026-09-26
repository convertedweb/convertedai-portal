# HANDOFF.md

## Aktuális cél

A portál folyamatban lévő bővítésének célja egy közös admin projektmenedzser létrehozása Kanban- és listanézettel, részletes feladatszerkesztéssel, ügyfél- és szerepköralapú láthatósággal, valamint a support ticketek automatikus feladattá alakításával. Ezzel párhuzamosan készül a superadmin-only ügyfél/feladat láthatóság, két új projektkategória és a Supabase magic-link visszahívás robusztusabb kezelése.

## Elkészült

- A korábbi, commitolt alap egy Next.js/Supabase ügyfél- és adminportál auth, ügyfél-, projekt-, support-, jogosultság-, aktivitásnapló-, telefon- és voice-agent funkciókkal.
- A production Docker/GHCR/DigitalOcean/Caddy telepítési út dokumentálva van a `docs/deployment-digitalocean.md` fájlban.
- A production auth origin és biztonságos redirect kezelése commitolva van; az ehhez tartozó teszt a `tests/auth-urls.test.ts` fájlban található.
- Elkészült az agentek közös repo-útmutatója (`AGENTS.md`) és a Claude Code belépési fájlja (`CLAUDE.md`).

## Félkész / folyamatban (fájlokkal együtt)

Az alábbi változások a munkakönyvtárban vannak, de ezen dokumentációs átadás készítésekor még nincsenek funkció-commitban:

- Projektmenedzser adatmodell, lekérdezések, Kanban/lista UI, drag-and-drop, létrehozás és szerkesztés:
  - `lib/project-management.ts`
  - `app/admin/tasks/page.tsx`
  - `app/admin/tasks/actions.ts`
  - `app/admin/tasks/kanban-board.tsx`
  - `app/admin/tasks/new-task-form.tsx`
  - `app/admin/tasks/[id]/page.tsx`
  - `app/admin/tasks/[id]/task-edit-form.tsx`
  - `app/globals.css`
- Support ticketből automatikus task létrehozás és kézi ticket→task művelet:
  - `app/portal/support/actions.ts`
  - `app/portal/support/page.tsx`
  - `app/admin/messages/page.tsx`
  - `app/admin/tasks/ticket-to-task-button.tsx`
  - `lib/support.ts`
- Superadmin-only ügyfél- és feladatláthatóság, admin adatbetöltés és ügyfélűrlapok:
  - `lib/admin-data.ts`
  - `app/admin/customers/new/actions.ts`
  - `app/admin/customers/new/new-customer-form.tsx`
  - `app/admin/customers/new/page.tsx`
  - `app/admin/customers/[id]/edit/actions.ts`
  - `app/admin/customers/[id]/edit/customer-settings-tabs.tsx`
  - `app/admin/customers/[id]/edit/edit-customer-form.tsx`
  - `app/admin/customers/[id]/edit/page.tsx`
- Új `ui_ux_design` és `website` projektkategóriák, valamint a kapcsolódó admin/portal felületi szövegek és navigáció:
  - `lib/project-types.ts`
  - `app/admin/admin-nav-links.tsx`
  - `app/admin/page.tsx`
  - `app/admin/projects/[id]/actions.ts`
  - `app/portal/nav-links.tsx`
  - `app/portal/page.tsx`
  - `app/portal/projects/page.tsx`
  - `app/portal/projects/new/actions.ts`
  - `app/portal/projects/new/page.tsx`
  - `app/portal/projects/new/project-onboarding.tsx`
  - `app/portal/settings/page.tsx`
  - `app/portal/settings/settings-tabs.tsx`
- Magic-link sablon és hibás `/auth/confirm&...` URL-ek kompatibilitási javítása:
  - `README.md`
  - `app/login/page.tsx`
  - `app/auth/confirm/route.ts`
  - `middleware.ts`
- Új, még nem commitolt adatbázis-migrációk:
  - `supabase/migrations/20260925174726_project_management_foundation.sql`
  - `supabase/migrations/20260925181150_optimize_project_management_rls.sql`
  - `supabase/migrations/20260926074934_add_superadmin_task_visibility.sql`
  - `supabase/migrations/20260926080059_add_superadmin_only_customer_visibility.sql`
  - `supabase/migrations/20260926081256_fix_organization_rls_recursion.sql`
  - `supabase/migrations/20260926082910_add_design_and_website_project_categories.sql`
- Generált/lokális fájlok is megjelentek (`tsconfig.tsbuildinfo`, `supabase/.temp/`); ezeket ne vedd bele a funkció-commitba. A `.gitignore` jelenleg nem zárja ki ezeket az útvonalakat.

## Következő lépés

1. Nézd át együtt a hat új migráció sorrendjét, constraintjeit és RLS policyjait, majd futtasd őket egy kijelölt teszt Supabase projekten.
2. Állíts be nem interaktív ESLint konfigurációt/CLI-t, és adj hozzá működő TypeScript test scriptet (Node 22.6+ vagy külön runner), majd futtasd újra a lintet és a teszteket.
3. Kézzel teszteld superadminnal, normál adminnal és ügyféllel: ügyfélláthatóság, task létrehozás/szerkesztés, Kanban mozgatás, ticket→task routing és portal oldali task megjelenés.
4. Ellenőrizd a magic-link belépést a dokumentált Supabase email sablonnal helyben és production callback URL-lel.
5. Egészítsd ki a `.gitignore`-t a bizonyítottan generált `tsconfig.tsbuildinfo` és `supabase/.temp/` fájlokra, majd a funkciót logikus, ellenőrzött commit(ok)ba rendezd.

## Fontos döntések és indoklásuk

- A taskok egy projekthez és szervezethez is kötődnek. Az összetett foreign key-k csökkentik annak kockázatát, hogy egy task vagy ticket más tenant projektjéhez kerüljön.
- Az adatbázis RLS az első védelmi vonal, de a service-role/admin klienssel futó kódban alkalmazásszintű szerepkör-, tenant- és láthatóság-ellenőrzés is szükséges, mert a service role megkerüli az RLS-t.
- A task láthatósági szintek `internal`, `client_visible` és `superadmin_only`. A `superadmin_only` utólagos migrációban került be, ezért a végleges schema ellenőrzésénél az összes migráció sorrendje számít.
- Általános és billing support ticket normál adminhoz, más témák elsődlegesen superadminhoz kerülnek; ha nincs kiválasztott projekt, szervezetenként belső `Ügyféltámogatás` projekt készül/használódik.
- A Kanban státuszmozgatás optimista UI-t használ és szerverhiba esetén visszaállítja a korábbi állapotot.
- A publishable/anon Supabase kulcs lehet kliensoldali, a `SUPABASE_SECRET_KEY` kizárólag szerveroldali. Productionban a public változók build időben is szükségesek.
- A magic-link sablon `TokenHash` alapú `/auth/confirm` URL-t használ. A middleware ideiglenesen korrigálja a hibásan `&` jellel kezdődő paramétereket is, hogy a korábban generált linkek ne törjenek el.
- A régi migrációkat nem írjuk át; minden schema-korrekció új, sorrendhelyes migráció.

## Ismert hibák, amit már kipróbáltunk és nem működött

- A Supabase PKCE `ConfirmationURL` használata másik böngészőben vagy elveszett/frissült session esetén `PKCE code verifier not found in storage` hibához vezetett. Emiatt a magic-link sablon `TokenHash` alapú megerősítésre váltott.
- A `{{ .RedirectTo }}&token_hash=...` forma hibás `/auth/confirm&token_hash=...` útvonalat képez, ha a redirect URL-ben még nincs query string. A helyes sablonban az első paraméter előtt `?` kell; a middleware csak visszafelé kompatibilitási védőháló.
- A meglévő n8n/Caddy Compose stack leállítása vagy `down -v` használata nem elfogadható deployment eljárás, mert szolgáltatáskiesést vagy adatvesztést okozhat. A dokumentált megoldás az override és a célzott Caddy reload/recreate.
- A folyamatban lévő projektmenedzser-változások lint-, teszt- és integrációs ellenőrzése még nem teljes; a sikeres build önmagában nem jelenti, hogy a jelenlegi worktree release-kész.
- A `npm run build` 2026-09-26-án sikeresen lefutott a jelenlegi, nem commitolt funkcióváltozásokkal együtt (fordítás, típusellenőrzés és 25 statikus oldal generálása rendben).
- A `npm run lint` nem futott le érdemben: a `next lint` ESLint konfigurációt kérő interaktív prompttal, 1-es státusszal leállt. A projektben még nincs kész ESLint konfiguráció.
- A `node --test --experimental-strip-types tests/*.test.ts` parancs a jelenlegi Node v20.19.5 környezetben nem működik (`node: bad option: --experimental-strip-types`). Ehhez Node 22.6+ vagy külön TypeScript test runner szükséges; maga a teszt ezen a körön nem futott le.
