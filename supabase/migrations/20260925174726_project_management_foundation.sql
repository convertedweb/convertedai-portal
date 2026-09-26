-- Project management foundation shared by internal work and the customer portal.

alter table projects
  add column if not exists project_type text not null default 'voice_agent'
    check (project_type in ('voice_agent', 'website', 'cro', 'automation', 'internal', 'other')),
  add column if not exists visibility text not null default 'client'
    check (visibility in ('internal', 'client'));

drop policy if exists "members can view organization projects" on projects;

create policy "members can view organization projects"
  on projects for select to authenticated
  using (
    visibility = 'client'
    and deleted_at is null
    and exists (
      select 1 from org_members
      where org_members.organization_id = projects.organization_id
        and org_members.user_id = (select auth.uid())
    )
  );

alter table projects
  add constraint projects_id_organization_id_key unique (id, organization_id);

alter table support_tickets
  add constraint support_tickets_id_organization_id_key unique (id, organization_id);

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'project_manager', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null,
  source_ticket_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  assignee_user_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  description text not null default '',
  status text not null default 'backlog'
    check (status in ('backlog', 'planned', 'in_progress', 'waiting_client', 'review', 'done', 'archived')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  visibility text not null default 'internal'
    check (visibility in ('internal', 'client_visible')),
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references projects(id, organization_id) on delete cascade,
  foreign key (source_ticket_id, organization_id)
    references support_tickets(id, organization_id)
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  organization_id uuid not null references organizations(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  visibility text not null default 'internal'
    check (visibility in ('internal', 'client_visible')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (task_id, organization_id)
    references tasks(id, organization_id) on delete cascade
);

create index project_members_user_id_idx on project_members(user_id);
create index tasks_organization_status_idx
  on tasks(organization_id, status, created_at desc)
  where deleted_at is null;
create index tasks_project_board_idx
  on tasks(project_id, status, sort_order, created_at)
  where deleted_at is null;
create index tasks_assignee_work_idx
  on tasks(assignee_user_id, status, due_at)
  where assignee_user_id is not null and deleted_at is null;
create index tasks_source_ticket_id_idx
  on tasks(source_ticket_id)
  where source_ticket_id is not null and deleted_at is null;
create index tasks_created_by_idx on tasks(created_by);
create index task_comments_task_created_at_idx
  on task_comments(task_id, created_at)
  where deleted_at is null;
create index task_comments_organization_id_idx on task_comments(organization_id);
create index task_comments_author_user_id_idx on task_comments(author_user_id);

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_row_updated_at() from public;

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function public.set_row_updated_at();

create trigger task_comments_set_updated_at
  before update on task_comments
  for each row execute function public.set_row_updated_at();

alter table project_members enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;

revoke all on project_members from anon, authenticated;
revoke all on tasks from anon, authenticated;
revoke all on task_comments from anon, authenticated;

grant select, insert, update on project_members to authenticated;
grant select, insert, update on tasks to authenticated;
grant select, insert, update on task_comments to authenticated;

create policy "users can view their project memberships"
  on project_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy "admins can view all project memberships"
  on project_members for select to authenticated
  using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "admins can create project memberships"
  on project_members for insert to authenticated
  with check (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "admins can update project memberships"
  on project_members for update to authenticated
  using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "admins can view all tasks"
  on tasks for select to authenticated
  using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "admins can create tasks"
  on tasks for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role in ('superadmin', 'admin')
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
    )
  );

create policy "admins can update tasks"
  on tasks for update to authenticated
  using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "members can view client visible tasks"
  on tasks for select to authenticated
  using (
    visibility = 'client_visible'
    and deleted_at is null
    and exists (
      select 1 from org_members
      where org_members.organization_id = tasks.organization_id
        and org_members.user_id = (select auth.uid())
    )
  );

create policy "admins can view all task comments"
  on task_comments for select to authenticated
  using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "admins can create task comments"
  on task_comments for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and (
      exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role in ('superadmin', 'admin')
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
    )
  );

create policy "admins can update task comments"
  on task_comments for update to authenticated
  using (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "members can view client visible task comments"
  on task_comments for select to authenticated
  using (
    visibility = 'client_visible'
    and deleted_at is null
    and exists (
      select 1 from tasks
      where tasks.id = task_comments.task_id
        and tasks.organization_id = task_comments.organization_id
        and tasks.visibility = 'client_visible'
        and tasks.deleted_at is null
    )
    and exists (
      select 1 from org_members
      where org_members.organization_id = task_comments.organization_id
        and org_members.user_id = (select auth.uid())
    )
  );

create policy "members can create client visible task comments"
  on task_comments for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and visibility = 'client_visible'
    and exists (
      select 1 from tasks
      where tasks.id = task_comments.task_id
        and tasks.organization_id = task_comments.organization_id
        and tasks.visibility = 'client_visible'
        and tasks.deleted_at is null
    )
    and exists (
      select 1 from org_members
      where org_members.organization_id = task_comments.organization_id
        and org_members.user_id = (select auth.uid())
    )
  );
