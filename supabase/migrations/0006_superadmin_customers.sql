create table if not exists super_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table super_admins enable row level security;

grant select on organizations to authenticated;
grant select on org_members to authenticated;
grant select on projects to authenticated;
grant select on documents to authenticated;
grant select on super_admins to authenticated;

drop policy if exists "super admins can view their admin access" on super_admins;
drop policy if exists "super admins can view all organizations" on organizations;
drop policy if exists "super admins can view all memberships" on org_members;
drop policy if exists "super admins can view all projects" on projects;
drop policy if exists "super admins can view all documents" on documents;

create policy "super admins can view their admin access"
  on super_admins for select to authenticated
  using (super_admins.user_id = (select auth.uid()));

create policy "super admins can view all organizations"
  on organizations for select to authenticated
  using (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));

create policy "super admins can view all memberships"
  on org_members for select to authenticated
  using (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));

create policy "super admins can view all projects"
  on projects for select to authenticated
  using (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));

create policy "super admins can view all documents"
  on documents for select to authenticated
  using (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));
