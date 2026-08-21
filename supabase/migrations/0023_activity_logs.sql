create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'client' check (actor_role in ('client', 'admin', 'system')),
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_organization_id_idx on activity_logs(organization_id);
create index if not exists activity_logs_project_id_idx on activity_logs(project_id);
create index if not exists activity_logs_actor_user_id_idx on activity_logs(actor_user_id);
create index if not exists activity_logs_created_at_idx on activity_logs(created_at desc);

alter table activity_logs enable row level security;

grant select, insert on activity_logs to authenticated;

drop policy if exists "members can view organization activity logs" on activity_logs;
drop policy if exists "members can create organization activity logs" on activity_logs;
drop policy if exists "admin roles can view all activity logs" on activity_logs;
drop policy if exists "super admins can view all activity logs" on activity_logs;

create policy "members can view organization activity logs"
  on activity_logs for select to authenticated
  using (exists (
    select 1
      from org_members
     where org_members.organization_id = activity_logs.organization_id
       and org_members.user_id = (select auth.uid())
  ));

create policy "members can create organization activity logs"
  on activity_logs for insert to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and actor_role = 'client'
    and exists (
      select 1
        from org_members
       where org_members.organization_id = activity_logs.organization_id
         and org_members.user_id = (select auth.uid())
    )
  );

create policy "admin roles can view all activity logs"
  on activity_logs for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "super admins can view all activity logs"
  on activity_logs for select to authenticated
  using (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));
