-- Consolidate permissive policies so each role/action evaluates one policy.

drop policy if exists "users can view their project memberships" on project_members;
drop policy if exists "admins can view all project memberships" on project_members;

create policy "authorized users can view project memberships"
  on project_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "admins can view all tasks" on tasks;
drop policy if exists "members can view client visible tasks" on tasks;

create policy "authorized users can view tasks"
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
    or (
      visibility = 'client_visible'
      and deleted_at is null
      and exists (
        select 1 from org_members
        where org_members.organization_id = tasks.organization_id
          and org_members.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "admins can view all task comments" on task_comments;
drop policy if exists "members can view client visible task comments" on task_comments;

create policy "authorized users can view task comments"
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
    or (
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
    )
  );

drop policy if exists "admins can create task comments" on task_comments;
drop policy if exists "members can create client visible task comments" on task_comments;

create policy "authorized users can create task comments"
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
      or (
        visibility = 'client_visible'
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
      )
    )
  );
