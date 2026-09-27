# HANDOFF.md

## Aktuális cél

A Next.js/Supabase ügyfélportál pénzügyi követésének és admin feladatkezelésének élesítése. A funkciók `4acbcd2` commitja és az RLS-javítás `06a9dca` commitja a `master` ágon és a GitHubon van. A `4acbcd2` commitból épült, ellenőrzött image fut a DigitalOcean Dropleten; a pénzügyi táblák RLS-javítása production Supabase-ben alkalmazva, a migráció a repóban szerepel.

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

- `app/admin/tasks/`, `lib/project-management.ts`, `app/globals.css`
- `app/admin/notifications/`, `app/admin/layout.tsx`, `lib/tasks.ts`
- `app/portal/support/`, `app/admin/messages/`, `lib/support.ts`
- `app/admin/customers/`, `lib/admin-data.ts`
- `lib/project-types.ts`, projektlétrehozó és projektoldalak
- `app/login/page.tsx`, `app/auth/confirm/route.ts`, `middleware.ts`, `README.md`
- `supabase/migrations/20260925*.sql` és `supabase/migrations/20260926*.sql`

## Következő konkrét lépések

1. Valódi superadmin, normál admin és ügyfél fiókkal teszteld a pénzügyi képernyőket és a közvetlen Supabase Data API-t. A normál admin nem kaphat `superadmin_only` szervezethez tartozó számla-, díjterv- vagy bevételsort, és nem írhat ilyet.
2. Egyeztesd a Supabase migration historyt a repó helyi verzióival, mielőtt CLI-alapú `db push` futna. Már alkalmazott migrációt ne írd át és ne futtasd újra.
3. Vizsgáld meg a Supabase security advisor három figyelmeztetését: `admin_customer_members` SECURITY DEFINER függvény [anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) és [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) szerepkörből hívható; a [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ki van kapcsolva. A jogosultságok változtatása előtt ellenőrizd a függvény tényleges használatát.
4. Teszteld manuálisan a feladatstátusz-váltást, Kanban/listanézetet, értesítésből feladatkészítést, ticket routingot és a magic-link production callbacket.
5. Állíts be nem interaktív ESLint konfigurációt és Node 22.6+ vagy külön TypeScript tesztfuttatót; utána futtasd a teljes tesztcsomagot.

## Fontos döntések

- A taskok projekthez és szervezethez is kötődnek; összetett foreign key védi a tenant-határokat.
- A service-role kliens minden érzékeny művelet előtt alkalmazásszintű szerepkör- és láthatóság-ellenőrzést kap, mert megkerüli az RLS-t.
- A szűrők URL query paraméterekben vannak, ezért frissítés és nézetváltás után is megmaradnak. A szűrőpanel alkalmazás után bezáródik.
- Az értesítés→task állapot az aktivitáslog metaadatában stabil `notificationKey` értékkel marad meg; a korábban létrehozott taskok cím+leírás fingerprint alapján ismerhetők fel.
- Az aktivitási idővonal a meglévő `activity_logs` táblát használja, ezért nem kellett új migráció. Az új `task_updated` események mezőszintű `changes` metaadatot kapnak.
- A magic-link sablon első query paramétere előtt `?` szükséges. A middleware csak visszafelé kompatibilitási védőháló a korábbi hibás `&` formára.
- A meglévő n8n/Caddy stacken tilos `docker compose down -v`; célzott service-frissítés és Caddy reload szükséges.

## Ellenőrzés

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

- A lokális migrációfájlok és a kapcsolt Supabase projekt historyjának időbélyegei eltérnek; nem biztonságos vakon `supabase db push` parancsot futtatni.
- A build, RLS-szabályellenőrzés és nyilvános smoke sikeres; bejelentkezett szerepkörös, tenant-határos kézi integrációs teszt még hiányzik.
- A Supabase security advisor három, az RLS-módosítástól független figyelmeztetést mutat; lásd a következő lépéseket.
- A régi aktivitásbejegyzések nem tartalmaznak minden mezőhöz előtte/utána értéket; a részletes változáslista az új mentésektől kezdve teljes.
- A generált `supabase/.temp/` és `tsconfig.tsbuildinfo` nincs commitolva.
