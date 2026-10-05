alter table public.projects
  add column minute_rate_huf numeric(10, 2)
  constraint projects_minute_rate_huf_nonnegative check (minute_rate_huf >= 0);
