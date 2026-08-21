# norpheus AI Portal

Az első verzió egy vékony ügyfélportál-alap: projektlista, projekt-részletek és a későbbi Supabase-alapú dokumentumkezelés helye.

## Indítás

```bash
npm install
cp .env.example .env.local
npm run dev
```

A portál a `http://localhost:3000/portal` címen érhető el.

## Supabase

A `supabase/migrations/0001_portal_foundation.sql` létrehozza az első domain táblákat, a `0002_tenant_access.sql` létrehozza a szervezeti tagságot és az alap RLS olvasási szabályokat, a `0003_project_creation.sql` engedélyezi, hogy a belépett organization tag új projektet hozzon létre, a `0004_project_update.sql` a projekt alapadatok szerkesztését engedi, a `0005_project_category.sql` hozzáadja a projekt kategóriát, a `0006_superadmin_customers.sql` pedig létrehozza a superadmin ügyfélkezelés jogosultságait. A migrációkat sorrendben futtasd.

Belépés után minden felhasználót hozzá kell adni egy szervezethez az `org_members` táblában, különben a projektlista üres marad.

### Első teszt projekt létrehozása

1. Jelentkezz be egyszer a portálon magic linkkel, hogy létrejöjjön a Supabase Auth user.
2. Nyisd meg a `supabase/seeds/first_project.sql` fájlt.
3. Cseréld ki a `__LOGIN_EMAIL__` értéket arra az email címre, amivel beléptél.
4. Futtasd le a fájl tartalmát a Supabase SQL Editorban.
5. Frissítsd a `http://localhost:3000/portal/projects` oldalt.

Ha minden rendben, megjelenik a `norpheus AI Voice Agent MVP` projekt.

### Superadmin hozzáférés

1. Futtasd le a `supabase/migrations/0006_superadmin_customers.sql` migrációt a Supabase SQL Editorban.
2. Jelentkezz be egyszer a portálon azzal az email címmel, amelyik superadmin lesz.
3. Futtasd ezt az SQL-t, az email címet kicserélve:

```sql
insert into super_admins (user_id)
select id
from auth.users
where email = '__LOGIN_EMAIL__'
on conflict (user_id) do nothing;
```

Ezután a superadmin felület a `http://localhost:3000/admin` címen érhető el.

### Magic link email sablon

PKCE auth flow esetén ne a `{{ .ConfirmationURL }}` linket használd, mert másik böngészőben vagy frissült session után `PKCE code verifier not found in storage` hibát okozhat. A Magic Link sablonban `{{ .TokenHash }}` alapú linket használj:

```html
<h2>Belépés a norpheus AI portálba</h2>

<p>Kattints az alábbi gombra a belépéshez:</p>

<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}"
     style="display:inline-block;padding:12px 18px;background:#6875e8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
    Belépés a portálba
  </a>
</p>

<p>Ez a belépési link rövid ideig érvényes, és csak egyszer használható.</p>
<p>Ha nem te kérted ezt a belépési linket, nyugodtan hagyd figyelmen kívül ezt az emailt.</p>
```

Az anon kulcs csak kliensoldali Supabase kliens létrehozására szolgálhat. Tenant-szűrést és minden írást szerveroldali route handler vagy server action kezeljen.
