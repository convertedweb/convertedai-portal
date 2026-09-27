create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  created_by uuid references auth.users(id) on delete set null,
  invoice_number text not null check (char_length(btrim(invoice_number)) between 1 and 120),
  issued_on date not null,
  payment_date date not null,
  status text not null default 'issued'
    check (status in ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'HUF' check (currency = 'HUF'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number),
  foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade
);

create index invoices_organization_date_idx
  on public.invoices(organization_id, issued_on desc);
create index invoices_project_organization_idx on public.invoices(project_id, organization_id);
create index invoices_created_by_idx on public.invoices(created_by);
create index invoices_status_payment_date_idx
  on public.invoices(status, payment_date)
  where status not in ('paid', 'cancelled');

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_row_updated_at();

alter table public.invoices enable row level security;

revoke all on table public.invoices from anon, authenticated;
grant select, insert, update on table public.invoices to authenticated;

create policy "admins can view invoices"
  on public.invoices for select to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from public.super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );

create policy "admins can create invoices"
  on public.invoices for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      exists (
        select 1 from public.admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role in ('superadmin', 'admin')
      )
      or exists (
        select 1 from public.super_admins
        where super_admins.user_id = (select auth.uid())
      )
    )
  );

create policy "admins can update invoices"
  on public.invoices for update to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from public.super_admins
      where super_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = (select auth.uid())
        and admin_roles.role in ('superadmin', 'admin')
    )
    or exists (
      select 1 from public.super_admins
      where super_admins.user_id = (select auth.uid())
    )
  );
