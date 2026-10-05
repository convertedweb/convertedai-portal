create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null,
  provider text not null check (provider in ('meta', 'google', 'elevenlabs', 'telnyx')),
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'attention_required', 'revoked')),
  external_account_id text,
  external_resource_id text,
  external_resource_name text,
  scopes text[] not null default '{}',
  secret_reference uuid,
  expires_at timestamptz,
  last_error text,
  connected_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id, project_id),
  foreign key (project_id, organization_id)
    references projects(id, organization_id) on delete cascade
);

create unique index integration_connections_active_provider_idx
  on integration_connections(project_id, provider)
  where deleted_at is null;

create index integration_connections_organization_idx
  on integration_connections(organization_id, provider)
  where deleted_at is null;

create table lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null,
  integration_connection_id uuid not null,
  meta_form_id text not null check (char_length(btrim(meta_form_id)) between 1 and 128),
  meta_form_name text not null check (char_length(btrim(meta_form_name)) between 1 and 300),
  enabled boolean not null default true,
  configuration_override jsonb not null default '{}'::jsonb,
  last_test_lead_at timestamptz,
  last_lead_received_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id, project_id),
  foreign key (project_id, organization_id)
    references projects(id, organization_id) on delete cascade,
  foreign key (integration_connection_id, organization_id, project_id)
    references integration_connections(id, organization_id, project_id)
);

create unique index lead_sources_active_meta_form_idx
  on lead_sources(meta_form_id)
  where deleted_at is null;

create index lead_sources_project_idx
  on lead_sources(project_id, enabled, created_at desc)
  where deleted_at is null;

create trigger integration_connections_set_updated_at
  before update on integration_connections
  for each row execute function public.set_row_updated_at();

create trigger lead_sources_set_updated_at
  before update on lead_sources
  for each row execute function public.set_row_updated_at();

alter table integration_connections enable row level security;
alter table lead_sources enable row level security;

revoke all on integration_connections from anon, authenticated;
revoke all on lead_sources from anon, authenticated;
grant select on integration_connections to authenticated;
grant select on lead_sources to authenticated;

create policy "authorized users can view integration connections"
  on integration_connections for select to authenticated
  using (
    deleted_at is null
    and (
      exists (
        select 1 from org_members
        where org_members.organization_id = integration_connections.organization_id
          and org_members.user_id = (select auth.uid())
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
      or (
        exists (
          select 1 from admin_roles
          where admin_roles.user_id = (select auth.uid())
            and admin_roles.role = 'admin'
        )
        and exists (
          select 1 from organizations
          where organizations.id = integration_connections.organization_id
            and organizations.superadmin_only = false
            and organizations.deleted_at is null
        )
      )
    )
  );

create policy "authorized users can view lead sources"
  on lead_sources for select to authenticated
  using (
    deleted_at is null
    and (
      exists (
        select 1 from org_members
        where org_members.organization_id = lead_sources.organization_id
          and org_members.user_id = (select auth.uid())
      )
      or exists (
        select 1 from super_admins
        where super_admins.user_id = (select auth.uid())
      )
      or (
        exists (
          select 1 from admin_roles
          where admin_roles.user_id = (select auth.uid())
            and admin_roles.role = 'admin'
        )
        and exists (
          select 1 from organizations
          where organizations.id = lead_sources.organization_id
            and organizations.superadmin_only = false
            and organizations.deleted_at is null
        )
      )
    )
  );
