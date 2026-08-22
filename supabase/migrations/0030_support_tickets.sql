create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  subject text not null,
  topic text not null check (topic in ('general', 'project', 'phone', 'knowledge_base', 'billing', 'technical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  last_message_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_role text not null default 'client' check (author_role in ('client', 'admin', 'system')),
  message text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_organization_id_idx on support_tickets(organization_id);
create index if not exists support_tickets_project_id_idx on support_tickets(project_id);
create index if not exists support_tickets_created_by_idx on support_tickets(created_by);
create index if not exists support_tickets_status_idx on support_tickets(status);
create index if not exists support_tickets_last_message_at_idx on support_tickets(last_message_at desc);
create index if not exists support_ticket_messages_ticket_id_idx on support_ticket_messages(ticket_id);
create index if not exists support_ticket_messages_organization_id_idx on support_ticket_messages(organization_id);

alter table support_tickets enable row level security;
alter table support_ticket_messages enable row level security;

grant select, insert, update on support_tickets to authenticated;
grant select, insert on support_ticket_messages to authenticated;

drop policy if exists "members can view organization support tickets" on support_tickets;
drop policy if exists "members can create organization support tickets" on support_tickets;
drop policy if exists "members can update their open support tickets" on support_tickets;
drop policy if exists "admin roles can view all support tickets" on support_tickets;
drop policy if exists "admin roles can update all support tickets" on support_tickets;
drop policy if exists "members can view organization support messages" on support_ticket_messages;
drop policy if exists "members can create organization support messages" on support_ticket_messages;
drop policy if exists "admin roles can view all support messages" on support_ticket_messages;
drop policy if exists "admin roles can create support messages" on support_ticket_messages;

create policy "members can view organization support tickets"
  on support_tickets for select to authenticated
  using (exists (
    select 1
      from org_members
     where org_members.organization_id = support_tickets.organization_id
       and org_members.user_id = (select auth.uid())
  ));

create policy "members can create organization support tickets"
  on support_tickets for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
        from org_members
       where org_members.organization_id = support_tickets.organization_id
         and org_members.user_id = (select auth.uid())
    )
    and (
      project_id is null
      or exists (
        select 1
          from projects
         where projects.id = support_tickets.project_id
           and projects.organization_id = support_tickets.organization_id
      )
    )
  );

create policy "members can update their open support tickets"
  on support_tickets for update to authenticated
  using (
    created_by = (select auth.uid())
    and status in ('open', 'in_progress')
    and exists (
      select 1
        from org_members
       where org_members.organization_id = support_tickets.organization_id
         and org_members.user_id = (select auth.uid())
    )
  )
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
        from org_members
       where org_members.organization_id = support_tickets.organization_id
         and org_members.user_id = (select auth.uid())
    )
  );

create policy "admin roles can view all support tickets"
  on support_tickets for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "admin roles can update all support tickets"
  on support_tickets for update to authenticated
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

create policy "members can view organization support messages"
  on support_ticket_messages for select to authenticated
  using (exists (
    select 1
      from org_members
     where org_members.organization_id = support_ticket_messages.organization_id
       and org_members.user_id = (select auth.uid())
  ));

create policy "members can create organization support messages"
  on support_ticket_messages for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and author_role = 'client'
    and exists (
      select 1
        from support_tickets
       where support_tickets.id = support_ticket_messages.ticket_id
         and support_tickets.organization_id = support_ticket_messages.organization_id
         and support_tickets.deleted_at is null
    )
    and exists (
      select 1
        from org_members
       where org_members.organization_id = support_ticket_messages.organization_id
         and org_members.user_id = (select auth.uid())
    )
  );

create policy "admin roles can view all support messages"
  on support_ticket_messages for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "admin roles can create support messages"
  on support_ticket_messages for insert to authenticated
  with check (
    author_user_id = (select auth.uid())
    and author_role = 'admin'
    and exists (
      select 1
        from admin_roles
       where admin_roles.user_id = (select auth.uid())
         and admin_roles.role in ('superadmin', 'admin')
    )
  );
