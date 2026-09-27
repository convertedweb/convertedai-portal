alter table public.invoices
  add column invoice_type text not null default 'setup_fee'
    check (invoice_type in ('setup_fee', 'monthly_fee'));

create index invoices_type_idx on public.invoices(invoice_type);
