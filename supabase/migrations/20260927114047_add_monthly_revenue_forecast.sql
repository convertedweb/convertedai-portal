create table public.monthly_fee_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'HUF' check (currency = 'HUF'),
  billing_day smallint not null check (billing_day between 1 and 28),
  starts_on date not null,
  ends_on date,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  check (ends_on is null or ends_on >= starts_on)
);

create table public.expected_revenues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  plan_id uuid not null,
  expected_on date not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'HUF' check (currency = 'HUF'),
  status text not null default 'planned' check (status in ('planned', 'received', 'missed', 'skipped')),
  received_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, expected_on),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  foreign key (plan_id, organization_id)
    references public.monthly_fee_plans(id, organization_id) on delete cascade,
  check ((status = 'received' and received_on is not null) or status <> 'received')
);

alter table public.invoices
  add column expected_revenue_id uuid unique references public.expected_revenues(id) on delete set null;

create index monthly_fee_plans_organization_status_idx on public.monthly_fee_plans(organization_id, status);
create index monthly_fee_plans_project_organization_idx on public.monthly_fee_plans(project_id, organization_id);
create index monthly_fee_plans_created_by_idx on public.monthly_fee_plans(created_by);
create index expected_revenues_horizon_idx on public.expected_revenues(expected_on, status);
create index expected_revenues_organization_date_idx on public.expected_revenues(organization_id, expected_on);
create index expected_revenues_project_organization_idx on public.expected_revenues(project_id, organization_id);
create index expected_revenues_plan_organization_idx on public.expected_revenues(plan_id, organization_id);

create trigger monthly_fee_plans_set_updated_at before update on public.monthly_fee_plans
  for each row execute function public.set_row_updated_at();
create trigger expected_revenues_set_updated_at before update on public.expected_revenues
  for each row execute function public.set_row_updated_at();

alter table public.monthly_fee_plans enable row level security;
alter table public.expected_revenues enable row level security;
revoke all on public.monthly_fee_plans, public.expected_revenues from anon, authenticated;
grant select, insert, update on public.monthly_fee_plans, public.expected_revenues to authenticated;

create policy "admins can view monthly fee plans" on public.monthly_fee_plans for select to authenticated
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid())));
create policy "admins can create monthly fee plans" on public.monthly_fee_plans for insert to authenticated
  with check (created_by = (select auth.uid()) and (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid()))));
create policy "admins can update monthly fee plans" on public.monthly_fee_plans for update to authenticated
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid())));

create policy "admins can view expected revenues" on public.expected_revenues for select to authenticated
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid())));
create policy "admins can create expected revenues" on public.expected_revenues for insert to authenticated
  with check (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid())));
create policy "admins can update expected revenues" on public.expected_revenues for update to authenticated
  using (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_roles where user_id = (select auth.uid()) and role in ('superadmin', 'admin')) or exists (select 1 from public.super_admins where user_id = (select auth.uid())));
