alter table public.tasks
  drop constraint if exists tasks_visibility_check;

alter table public.tasks
  add constraint tasks_visibility_check
  check (visibility in ('internal', 'client_visible', 'superadmin_only'));

drop policy if exists "authorized users can view tasks" on public.tasks;
drop policy if exists "admins can create tasks" on public.tasks;
drop policy if exists "admins can update tasks" on public.tasks;

create policy "authorized users can view tasks"
  on public.tasks for select to authenticated
  using (
    exists (
      select 1 from public.super_admins
      where super_admins.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role = 'superadmin'
    )
    or (
      visibility <> 'superadmin_only'
      and exists (
        select 1 from public.admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'admin'
      )
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

create policy "admins can create tasks"
  on public.tasks for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      exists (
        select 1 from public.super_admins
        where super_admins.user_id = (select auth.uid())
      )
      or exists (
        select 1 from public.admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'superadmin'
      )
      or (
        visibility <> 'superadmin_only'
        and exists (
          select 1 from public.admin_roles
          where admin_roles.user_id = (select auth.uid())
            and admin_roles.role = 'admin'
        )
      )
    )
  );

create policy "admins can update tasks"
  on public.tasks for update to authenticated
  using (
    exists (
      select 1 from public.super_admins
      where super_admins.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role = 'superadmin'
    )
    or (
      visibility <> 'superadmin_only'
      and exists (
        select 1 from public.admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'admin'
      )
    )
  )
  with check (
    exists (
      select 1 from public.super_admins
      where super_admins.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role = 'superadmin'
    )
    or (
      visibility <> 'superadmin_only'
      and exists (
        select 1 from public.admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'admin'
      )
    )
  );
