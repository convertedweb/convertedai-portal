-- Avoid organizations -> org_members -> organizations policy recursion.
-- Organization visibility is still enforced on organizations and all admin UI
-- data is filtered server-side for non-superadmins.
drop policy if exists "admin roles can view all memberships" on public.org_members;

create policy "admin roles can view all memberships"
  on public.org_members for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
  );
