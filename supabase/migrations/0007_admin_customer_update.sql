alter table organizations
  add column if not exists company_name text;

grant update (name, company_name, status, updated_at) on organizations to authenticated;

drop policy if exists "super admins can update organizations" on organizations;

create policy "super admins can update organizations"
  on organizations for update to authenticated
  using (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));
