create table if not exists admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('superadmin', 'admin')),
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table admin_roles enable row level security;

grant select on admin_roles to authenticated;
grant insert (name, company_name, slug, status) on organizations to authenticated;
grant update (name, company_name, slug, status, updated_at) on organizations to authenticated;

drop policy if exists "admin roles can view their admin access" on admin_roles;
drop policy if exists "admin roles can view all organizations" on organizations;
drop policy if exists "admin roles can view all memberships" on org_members;
drop policy if exists "admin roles can view all projects" on projects;
drop policy if exists "admin roles can view all documents" on documents;
drop policy if exists "admin roles can update organizations" on organizations;
drop policy if exists "admin roles can create organizations" on organizations;

create policy "admin roles can view their admin access"
  on admin_roles for select to authenticated
  using (admin_roles.user_id = (select auth.uid()));

create policy "admin roles can view all organizations"
  on organizations for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "admin roles can view all memberships"
  on org_members for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "admin roles can view all projects"
  on projects for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "admin roles can view all documents"
  on documents for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "admin roles can update organizations"
  on organizations for update to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ))
  with check (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "admin roles can create organizations"
  on organizations for insert to authenticated
  with check (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create or replace function public.admin_customer_members(p_organization_ids uuid[])
returns table (
  id uuid,
  organization_id uuid,
  user_id uuid,
  name text,
  email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    org_members.id,
    org_members.organization_id,
    org_members.user_id,
    coalesce(
      nullif(auth.users.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth.users.raw_user_meta_data ->> 'name', ''),
      split_part(auth.users.email, '@', 1),
      'Nincs nev'
    ) as name,
    coalesce(auth.users.email, 'Nincs e-mail') as email,
    org_members.role,
    org_members.created_at
  from public.org_members
  join auth.users on auth.users.id = org_members.user_id
  where org_members.organization_id = any(p_organization_ids)
    and (
      exists (
        select 1
          from public.super_admins
         where super_admins.user_id = (select auth.uid())
      )
      or exists (
        select 1
          from public.admin_roles
         where admin_roles.user_id = (select auth.uid())
           and admin_roles.role in ('superadmin', 'admin')
      )
    );
$$;

revoke all on function public.admin_customer_members(uuid[]) from public;
grant execute on function public.admin_customer_members(uuid[]) to authenticated;
