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

### Első teszt projekt létrehozása

1. Jelentkezz be egyszer a portálon magic linkkel, hogy létrejöjjön a Supabase Auth user.
2. Nyisd meg a `supabase/seeds/first_project.sql` fájlt.
3. Cseréld ki a `__LOGIN_EMAIL__` értéket arra az email címre, amivel beléptél.
4. Futtasd le a fájl tartalmát a Supabase SQL Editorban.
5. Frissítsd a `http://localhost:3000/portal/projects` oldalt.

Ha minden rendben, megjelenik a `ConvertedAI Voice Agent MVP` projekt.

Az anon kulcs csak kliensoldali Supabase kliens létrehozására szolgálhat. Tenant-szűrést és minden írást szerveroldali route handler vagy server action kezeljen.
