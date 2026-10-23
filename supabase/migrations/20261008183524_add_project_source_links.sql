create table project_source_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null,
  kind text not null check (kind in ('figma', 'reference', 'existing_site', 'shared_assets', 'other')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  url text not null check (char_length(url) between 8 and 2000 and url ~* '^https?://'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references projects(id, organization_id) on delete cascade
);

create index project_source_links_project_idx
  on project_source_links(project_id, created_at desc)
  where deleted_at is null;

alter table project_source_links enable row level security;

revoke all on project_source_links from anon, authenticated;
grant select, insert on project_source_links to authenticated;
grant update (deleted_at) on project_source_links to authenticated;

create policy "authorized users can view project source links"
  on project_source_links for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from projects
      where projects.id = project_source_links.project_id
        and projects.organization_id = project_source_links.organization_id
        and projects.deleted_at is null
    )
    and (
      exists (
        select 1 from org_members
        where org_members.organization_id = project_source_links.organization_id
          and org_members.user_id = (select auth.uid())
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
      or exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'superadmin'
      )
      or (
        exists (
          select 1 from admin_roles
          where admin_roles.user_id = (select auth.uid())
            and admin_roles.role = 'admin'
        )
        and exists (
          select 1 from organizations
          where organizations.id = project_source_links.organization_id
            and organizations.superadmin_only = false
            and organizations.deleted_at is null
        )
      )
    )
  );

create policy "members and superadmins can add project source links"
  on project_source_links for insert to authenticated
  with check (
    deleted_at is null
    and exists (
      select 1 from projects
      where projects.id = project_source_links.project_id
        and projects.organization_id = project_source_links.organization_id
        and projects.category in ('ui_ux_design', 'website')
        and projects.deleted_at is null
    )
    and (
      exists (
        select 1 from org_members
        where org_members.organization_id = project_source_links.organization_id
          and org_members.user_id = (select auth.uid())
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
      or exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'superadmin'
      )
    )
  );

create policy "members and superadmins can remove project source links"
  on project_source_links for update to authenticated
  using (
    deleted_at is null
    and (
      exists (
        select 1 from org_members
        where org_members.organization_id = project_source_links.organization_id
          and org_members.user_id = (select auth.uid())
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
      or exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'superadmin'
      )
    )
  )
  with check (
    deleted_at is not null
    and exists (
      select 1 from projects
      where projects.id = project_source_links.project_id
        and projects.organization_id = project_source_links.organization_id
        and projects.category in ('ui_ux_design', 'website')
        and projects.deleted_at is null
    )
    and (
      exists (
        select 1 from org_members
        where org_members.organization_id = project_source_links.organization_id
          and org_members.user_id = (select auth.uid())
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
      or exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'superadmin'
      )
    )
  );
