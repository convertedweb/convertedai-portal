begin;

drop policy if exists "admins can view invoices" on public.invoices;
drop policy if exists "admins can create invoices" on public.invoices;
drop policy if exists "admins can update invoices" on public.invoices;
drop policy if exists "admins can view monthly fee plans" on public.monthly_fee_plans;
drop policy if exists "admins can create monthly fee plans" on public.monthly_fee_plans;
drop policy if exists "admins can update monthly fee plans" on public.monthly_fee_plans;
drop policy if exists "admins can view expected revenues" on public.expected_revenues;
drop policy if exists "admins can create expected revenues" on public.expected_revenues;
drop policy if exists "admins can update expected revenues" on public.expected_revenues;

create policy "admins can view invoices" on public.invoices for select to authenticated
  using (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = invoices.organization_id and superadmin_only = false)
    )
  );

create policy "admins can create invoices" on public.invoices for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      exists (select 1 from public.super_admins where user_id = (select auth.uid()))
      or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
      or (
        exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
        and exists (select 1 from public.organizations where id = invoices.organization_id and superadmin_only = false)
      )
    )
  );

create policy "admins can update invoices" on public.invoices for update to authenticated
  using (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = invoices.organization_id and superadmin_only = false)
    )
  )
  with check (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = invoices.organization_id and superadmin_only = false)
    )
  );

create policy "admins can view monthly fee plans" on public.monthly_fee_plans for select to authenticated
  using (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = monthly_fee_plans.organization_id and superadmin_only = false)
    )
  );

create policy "admins can create monthly fee plans" on public.monthly_fee_plans for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      exists (select 1 from public.super_admins where user_id = (select auth.uid()))
      or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
      or (
        exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
        and exists (select 1 from public.organizations where id = monthly_fee_plans.organization_id and superadmin_only = false)
      )
    )
  );

create policy "admins can update monthly fee plans" on public.monthly_fee_plans for update to authenticated
  using (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = monthly_fee_plans.organization_id and superadmin_only = false)
    )
  )
  with check (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = monthly_fee_plans.organization_id and superadmin_only = false)
    )
  );

create policy "admins can view expected revenues" on public.expected_revenues for select to authenticated
  using (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = expected_revenues.organization_id and superadmin_only = false)
    )
  );

create policy "admins can create expected revenues" on public.expected_revenues for insert to authenticated
  with check (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = expected_revenues.organization_id and superadmin_only = false)
    )
  );

create policy "admins can update expected revenues" on public.expected_revenues for update to authenticated
  using (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = expected_revenues.organization_id and superadmin_only = false)
    )
  )
  with check (
    exists (select 1 from public.super_admins where user_id = (select auth.uid()))
    or exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'superadmin')
    or (
      exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role = 'admin')
      and exists (select 1 from public.organizations where id = expected_revenues.organization_id and superadmin_only = false)
    )
  );

commit;
