drop index if exists public.invoices_project_id_idx;
create index if not exists invoices_project_organization_idx
  on public.invoices(project_id, organization_id);
create index if not exists invoices_created_by_idx
  on public.invoices(created_by);
