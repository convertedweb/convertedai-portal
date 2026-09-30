# AGENTS.md

Ez a fájl a repón dolgozó AI agentek elsődleges technikai útmutatója. Módosítás előtt olvasd el a `HANDOFF.md`-t is, mert az tartalmazza az aktuális munkamenet állapotát és a következő lépést.

## Stack

- Next.js 15 App Router, React 19, TypeScript strict módban.
- Supabase Auth, Postgres, Storage és RLS; SSR kliens: `@supabase/ssr`.
- Szerveroldali módosítások Next.js Server Actionökön és route handlereken keresztül.
- Ikonok: `lucide-react`.
- Stílusok: globális CSS az `app/globals.css` fájlban; nincs külön CSS framework.
- Telepítés: standalone Next.js Docker image, GitHub Actions/GHCR, DigitalOcean és Caddy.
- A felület és a felhasználói üzenetek nyelve magyar.

## Mappastruktúra

- `app/`: App Router oldalak, layoutek, route handlerek és az oldalhoz közeli komponensek/actionök.
  - `app/admin/`: belső admin és superadmin felület.
  - `app/portal/`: ügyfélportál.
  - `app/auth/`: Supabase auth callback, megerősítés és kijelentkezés.
  - `app/api/`: HTTP API route-ok, köztük health check és hanganyag proxy.
- `lib/`: megosztott domainlogika, lekérdezések, jogosultságok, típusok és integrációk.
  - `lib/supabase/`: böngészős, szerveres, admin és session Supabase kliensek.
- `supabase/migrations/`: append-only adatbázis-migrációk. A régi migrációkat ne írd át; új változáshoz új fájlt adj hozzá.
- `supabase/seeds/`: kézi fejlesztői seedek.
- `tests/`: Node beépített tesztfuttatójával futó TypeScript tesztek.
- `docs/`: termék-, fejlesztési és deployment dokumentáció.
- `deploy/`, `Dockerfile`, `docker-compose.production.yml`: production infrastruktúra.
- `public/`: statikus assetek.

## Kódolási konvenciók

- Tartsd meg a TypeScript strict kompatibilitást; új kódban ne használj `any`-t indoklás nélkül.
- Használd a `@/` alias importot repo-szintű modulokhoz; lokális testvérfájlhoz relatív importot.
- Alapértelmezésben Server Componentet használj. Csak interaktív komponens kapjon `"use client"` direktívát.
- Adatmódosítást Server Actionben vagy route handlerben végezz, és sikeres írás után hívd a szükséges `revalidatePath`-ot.
- Form inputot szerveroldalon is normalizálj és validálj. A kliensoldali ellenőrzés nem jogosultsági határ.
- Jogosultságot minden érzékeny lekérdezés és írás előtt ellenőrizz. Az admin/service-role kliens használata nem helyettesíti az alkalmazásszintű tenant-, szerepkör- és láthatóság-ellenőrzést.
- Tenant adatoknál mindig tartsd meg az `organization_id` szerinti izolációt, a soft delete esetén pedig a `deleted_at is null` szűrést.
- A `SUPABASE_SECRET_KEY` / service-role kulcs kizárólag szerveroldali kódban használható. Böngészőbe vagy `NEXT_PUBLIC_*` változóba nem kerülhet.
- Az enum-szerű értékeket string unionnel és közös konstansokkal kezeld; a magyar címkéket központilag tartsd, ha több felület használja őket.
- Kövesd a meglévő formázást: két szóköz, pontosvessző, dupla idézőjel, trailing comma többsoros szerkezetekben.
- A felhasználói szöveg legyen magyar; technikai log és belső azonosító lehet angol.
- Ne vezess be új csomagot, frameworköt vagy nagy architekturális mintát, ha a feladat megoldható a jelenlegi stackkel.

## Környezeti változók

A szükséges kulcsokat az `.env.example` sorolja fel. Helyi fejlesztéshez `.env.local` fájlt használj. A publikus Supabase URL és publishable/anon kulcs mellett az admin funkciókhoz szerveroldali `SUPABASE_SECRET_KEY`, az ElevenLabs funkciókhoz `ELEVENLABS_API_KEY` kell.

Soha ne commitolj `.env*` fájlt, valódi tokent, service-role kulcsot, Supabase project referenciát vagy más titkot.

## Build, teszt és lint

```bash
npm install
npm run dev
npm run build
npm run lint
node --test --experimental-strip-types tests/*.test.ts  # Node 22.6+
```

- A fejlesztői szerver a `http://localhost:3000` címen fut.
- Minden kódmódosítás után legalább az érintett tesztet és a TypeScript/build ellenőrzést futtasd.
- Tesztek futtatása: `npm test` (Node 20-on is működik; tsc-vel fordít, majd `node --test`). A fenti explicit Node parancs csak Node 22.6+ alatt fut.
- Ha `npm run lint` a Next.js verzió miatt magának a parancsnak a hibájával áll le, ezt ne tekintsd tiszta lint eredménynek: dokumentáld a `HANDOFF.md`-ben, és külön futtasd a buildet.
- Adatbázis-változásnál ellenőrizd a migráció SQL-jét és lehetőség szerint teszt Supabase projekten futtasd le. A migráció futtatása külső állapotváltozás; csak a kijelölt környezetben végezd.

## Git és átadás

- Munka előtt nézd meg a `git status --short` kimenetét. A munkakönyvtárban lévő, más által készített változtatásokat őrizd meg.
- Egy commit csak összetartozó változásokat tartalmazzon; ne stage-elj automatikusan minden fájlt.
- Ne commitold a generált `.next/`, `.next-dev/`, `tsconfig.tsbuildinfo`, `supabase/.temp/` vagy lokális környezeti fájlokat.
- A migrációk sorrendje számít. Már alkalmazott migrációt ne nevezz át, ne törölj és ne írj visszamenőleg át.

## Deploy előtti adatellenőrzés

- Minden éles deploy előtt kérdezd meg a felhasználót: a helyi környezetben létrehozott új ügyfeleket, projekteket és egyéb adatokat át akarja-e vinni az éles Supabase projektbe, vagy ezek csak tesztadatok. A válasz megérkezéséig ne indíts adatmásolást, seedet vagy éles adatbázis-módosítást.
- Alapértelmezésben csak a kódot és a jóváhagyott sémamigrációkat telepítsd; helyi adatrekordokat ne másolj automatikusan. Ha az adatátvitelre igen a válasz, előbb egyeztesd a konkrét rekordokat, a célkörnyezetet, a duplikációkezelést és a mentési/visszaállítási tervet.
- Deploy előtt ellenőrizd, hogy a helyi alkalmazás és az éles portál ugyanarra a Supabase projektre mutat-e. Ha igen, mondd el egyértelműen, hogy a helyben felvitt adatok már az éles adatbázisban vannak, így nincs külön feltöltési lépés; tesztadatokat csak kifejezett jóváhagyással tisztíts.

## Tilos

- Tilos titkot, személyes adatot vagy production credentialt kliensoldali bundle-be, logba, dokumentációba vagy gitbe tenni.
- Tilos a service-role klienssel végzett műveletet jogosultság- és tenant-ellenőrzés nélkül elérhetővé tenni.
- Tilos az RLS-t általánosan kikapcsolni vagy széles, minden authenticated userre nyitott policyval megkerülni.
- Tilos production adatbázison destruktív SQL-t, migrációt, seedet vagy adattisztítást explicit engedély és mentési terv nélkül futtatni.
- Tilos `git reset --hard`, más munkáját eldobó checkout, erőltetett push vagy indokolatlan history rewrite.
- Tilos a meglévő Caddy/n8n stacken `docker compose down -v` parancsot futtatni; ez adatvesztést okozhat.
- Tilos a generált vagy lokális állományokat (`tsconfig.tsbuildinfo`, `supabase/.temp/`) kézzel szerkeszteni vagy commitolni. A Next.js által kezelt, már követett `next-env.d.ts`-t se módosítsd kézzel.

Munka végén vagy átadás előtt mindig frissítsd a HANDOFF.md-t.
