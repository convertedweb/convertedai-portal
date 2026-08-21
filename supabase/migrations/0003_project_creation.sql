grant insert on projects to authenticated;

drop policy if exists "members can create organization projects" on projects;

create policy "members can create organization projects"
  on projects for insert to authenticated
  with check (exists (
    select 1
      from org_members
     where org_members.organization_id = projects.organization_id
       and org_members.user_id = auth.uid()
  ));
