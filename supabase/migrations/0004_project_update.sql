grant update (name, agent_display_name, phone_number, status, updated_at) on projects to authenticated;

drop policy if exists "members can update organization projects" on projects;

create policy "members can update organization projects"
  on projects for update to authenticated
  using (exists (
    select 1
      from org_members
     where org_members.organization_id = projects.organization_id
       and org_members.user_id = auth.uid()
  ))
  with check (exists (
    select 1
      from org_members
     where org_members.organization_id = projects.organization_id
       and org_members.user_id = auth.uid()
  ));
