alter table public.organizations
  add column if not exists superadmin_only boolean not null default false;

grant update (superadmin_only) on public.organizations to authenticated;

drop policy if exists "admin roles can view all organizations" on public.organizations;
drop policy if exists "admin roles can update organizations" on public.organizations;
drop policy if exists "admin roles can create organizations" on public.organizations;

create policy "admin roles can view all organizations"
  on public.organizations for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (admin_roles.role = 'admin' and organizations.superadmin_only = false)
        )
    )
  );

create policy "admin roles can update organizations"
  on public.organizations for update to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (admin_roles.role = 'admin' and organizations.superadmin_only = false)
        )
    )
  )
  with check (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (admin_roles.role = 'admin' and organizations.superadmin_only = false)
        )
    )
  );

create policy "admin roles can create organizations"
  on public.organizations for insert to authenticated
  with check (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (admin_roles.role = 'admin' and organizations.superadmin_only = false)
        )
    )
  );

drop policy if exists "admin roles can view all projects" on public.projects;
create policy "admin roles can view all projects"
  on public.projects for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (
            admin_roles.role = 'admin'
            and exists (
              select 1 from public.organizations
              where organizations.id = projects.organization_id
                and organizations.superadmin_only = false
            )
          )
        )
    )
  );

drop policy if exists "admin roles can view all memberships" on public.org_members;
create policy "admin roles can view all memberships"
  on public.org_members for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (
            admin_roles.role = 'admin'
            and exists (
              select 1 from public.organizations
              where organizations.id = org_members.organization_id
                and organizations.superadmin_only = false
            )
          )
        )
    )
  );

drop policy if exists "admin roles can view all documents" on public.documents;
create policy "admin roles can view all documents"
  on public.documents for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (
            admin_roles.role = 'admin'
            and exists (
              select 1 from public.organizations
              where organizations.id = documents.organization_id
                and organizations.superadmin_only = false
            )
          )
        )
    )
  );

drop policy if exists "authorized users can view tasks" on public.tasks;
create policy "authorized users can view tasks"
  on public.tasks for select to authenticated
  using (
    exists (select 1 from public.super_admins where super_admins.user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where admin_roles.user_id = (select auth.uid()) and admin_roles.role = 'superadmin')
    or (
      visibility <> 'superadmin_only'
      and exists (select 1 from public.admin_roles where admin_roles.user_id = (select auth.uid()) and admin_roles.role = 'admin')
      and exists (select 1 from public.organizations where organizations.id = tasks.organization_id and organizations.superadmin_only = false)
    )
    or (
      visibility = 'client_visible'
      and deleted_at is null
      and exists (
        select 1 from public.org_members
        where org_members.organization_id = tasks.organization_id
          and org_members.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "admin roles can view all support tickets" on public.support_tickets;
create policy "admin roles can view all support tickets"
  on public.support_tickets for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (
            admin_roles.role = 'admin'
            and exists (select 1 from public.organizations where organizations.id = support_tickets.organization_id and organizations.superadmin_only = false)
          )
        )
    )
  );

drop policy if exists "admin roles can view all support messages" on public.support_ticket_messages;
create policy "admin roles can view all support messages"
  on public.support_ticket_messages for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and (
          admin_roles.role = 'superadmin'
          or (
            admin_roles.role = 'admin'
            and exists (select 1 from public.organizations where organizations.id = support_ticket_messages.organization_id and organizations.superadmin_only = false)
          )
        )
    )
  );
