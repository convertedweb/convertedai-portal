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

A `supabase/migrations/0001_portal_foundation.sql` létrehozza az első domain táblákat, a `0002_tenant_access.sql` pedig létrehozza a szervezeti tagságot és az alap RLS olvasási szabályokat. A második migrációt csak az első után futtasd.

Belépés után minden felhasználót hozzá kell adni egy szervezethez az `org_members` táblában, különben a projektlista üres marad.

Az anon kulcs csak kliensoldali Supabase kliens létrehozására szolgálhat. Tenant-szűrést és minden írást szerveroldali route handler vagy server action kezeljen.
