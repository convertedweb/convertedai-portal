grant insert (name, company_name, slug, status) on organizations to authenticated;

drop policy if exists "super admins can create organizations" on organizations;

create policy "super admins can create organizations"
  on organizations for insert to authenticated
  with check (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));
