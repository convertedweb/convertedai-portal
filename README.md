# ConvertedAI Portal

Az első verzió egy vékony ügyfélportál-alap: projektlista, projekt-részletek és a későbbi Supabase-alapú dokumentumkezelés helye.

## Indítás

```bash
npm install
cp .env.example .env.local
npm run dev
```

A portál a `http://localhost:3000/portal` címen érhető el.

## Supabase

A `supabase/migrations/0001_portal_foundation.sql` létrehozza az első domain táblákat. A migráció futtatása után a `projects` és `documents` adatforrásokat a `lib/data.ts` mock adatai helyett szerveroldali Supabase-lekérdezésekre lehet cserélni.

Az anon kulcs csak kliensoldali Supabase kliens létrehozására szolgálhat. Tenant-szűrést és minden írást szerveroldali route handler vagy server action kezeljen.
