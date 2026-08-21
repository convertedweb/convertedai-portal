alter table projects
  add column if not exists monthly_minute_limit integer check (monthly_minute_limit is null or monthly_minute_limit >= 0),
  add column if not exists carryover_minutes integer check (carryover_minutes is null or carryover_minutes >= 0);
