create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'client_owner' check (role in ('client_owner', 'client_member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists org_members_user_id_idx on org_members(user_id);

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table projects enable row level security;
alter table documents enable row level security;

create policy "members can view their organizations"
  on organizations for select to authenticated
  using (exists (select 1 from org_members where org_members.organization_id = organizations.id and org_members.user_id = auth.uid()));

create policy "members can view their memberships"
  on org_members for select to authenticated
  using (org_members.user_id = auth.uid());

create policy "members can view organization projects"
  on projects for select to authenticated
  using (exists (select 1 from org_members where org_members.organization_id = projects.organization_id and org_members.user_id = auth.uid()));

create policy "members can view organization documents"
  on documents for select to authenticated
  using (exists (select 1 from org_members where org_members.organization_id = documents.organization_id and org_members.user_id = auth.uid()));
