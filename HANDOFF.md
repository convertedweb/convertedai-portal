# HANDOFF.md

## Aktuális cél

A Next.js/Supabase ügyfélportál kibővítése közös admin feladatkezelővel, ügyfél- és szerepköralapú láthatósággal, support ticket routinggal, külön értesítési felülettel és robusztus magic-link belépéssel. A mostani munkamenet funkciói elkészültek és helyi commitba rendezhetők; a következő fő feladat az adatbázis-migrációk és a szerepkörös működés integrációs ellenőrzése.

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

- `app/admin/tasks/`, `lib/project-management.ts`, `app/globals.css`
- `app/admin/notifications/`, `app/admin/layout.tsx`, `lib/tasks.ts`
- `app/portal/support/`, `app/admin/messages/`, `lib/support.ts`
- `app/admin/customers/`, `lib/admin-data.ts`
- `lib/project-types.ts`, projektlétrehozó és projektoldalak
- `app/login/page.tsx`, `app/auth/confirm/route.ts`, `middleware.ts`, `README.md`
- `supabase/migrations/20260925*.sql` és `supabase/migrations/20260926*.sql`

## Következő konkrét lépések

1. Ellenőrizd a hat új migráció sorrendjét, constraintjeit és RLS policyjait; hasonlítsd össze a kapcsolt Supabase projekt migrációtörténetével. Ne írj át már alkalmazott migrációt.
2. Teszteld manuálisan külön superadmin, normál admin és ügyfél fiókkal:
   - superadmin-only ügyfél/feladat láthatóság;
   - task létrehozás, szerkesztés, Kanban mozgatás és aktivitásidővonal;
   - értesítés→task jelölés és ticket routing;
   - ügyfél számára látható taskok.
3. Ellenőrizd helyben és production callbackkel a TokenHash magic-link folyamatot a README-ben lévő Supabase sablonnal.
4. Állíts be nem interaktív ESLint konfigurációt és Node 22.6+ vagy külön TypeScript tesztfuttatót.
5. Ha az integrációs ellenőrzés zöld, deployold a commitot a meglévő GitHub Actions/GHCR/DigitalOcean folyamaton keresztül.
6. Következő termékfunkcióként javasolt: belső/ügyfélkommentek és feladatfájlok.

## Fontos döntések

- A taskok projekthez és szervezethez is kötődnek; összetett foreign key védi a tenant-határokat.
- A service-role kliens minden érzékeny művelet előtt alkalmazásszintű szerepkör- és láthatóság-ellenőrzést kap, mert megkerüli az RLS-t.
- A szűrők URL query paraméterekben vannak, ezért frissítés és nézetváltás után is megmaradnak. A szűrőpanel alkalmazás után bezáródik.
- Az értesítés→task állapot az aktivitáslog metaadatában stabil `notificationKey` értékkel marad meg; a korábban létrehozott taskok cím+leírás fingerprint alapján ismerhetők fel.
- Az aktivitási idővonal a meglévő `activity_logs` táblát használja, ezért nem kellett új migráció. Az új `task_updated` események mezőszintű `changes` metaadatot kapnak.
- A magic-link sablon első query paramétere előtt `?` szükséges. A middleware csak visszafelé kompatibilitási védőháló a korábbi hibás `&` formára.
- A meglévő n8n/Caddy stacken tilos `docker compose down -v`; célzott service-frissítés és Caddy reload szükséges.

## Ellenőrzés

- `npx tsc --noEmit --incremental false`: sikeres 2026-09-26.
- `npm run build`: sikeres 2026-09-26; fordítás, típusellenőrzés és 26 oldal generálása rendben.
- Csak olvasási Supabase ellenőrzés: `activity_logs` JSON `taskId` szűrés sikeres (`activity-filter-ok rows=1`).
- `git diff --check`: sikeres.
- Titokminták célzott keresése nem talált commitolandó credentialt.
- `npm run lint`: nem futott le érdemben, mert a projekt jelenlegi `next lint` parancsa interaktív ESLint-beállítást kér.
- `node --test --experimental-strip-types tests/*.test.ts`: a jelenlegi Node 20 környezetben nem fut (`--experimental-strip-types` Node 22.6+ szükséges).
- Böngészős, bejelentkezett admin ellenőrzés nem történt meg, mert a helyi in-app böngészőben nem volt aktív admin session.

## Ismert kockázatok és megjegyzések

- A lokális migrációfájlok és a kapcsolt Supabase projekt migrációtörténete még nincs ebben a handoffban bizonyítottan szinkronizálva.
- A build sikeres, de a szerepkörös és tenant-határos kézi integrációs teszt még kötelező deployment előtt.
- A régi aktivitásbejegyzések nem tartalmaznak minden mezőhöz előtte/utána értéket; a részletes változáslista az új mentésektől kezdve teljes.
- A generált `supabase/.temp/` és `tsconfig.tsbuildinfo` nincs commitolva.
