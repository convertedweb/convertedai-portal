alter table projects
  alter column monthly_minute_limit set default 1000,
  alter column carryover_minutes set default 500;

update projects
set
  monthly_minute_limit = coalesce(monthly_minute_limit, 1000),
  carryover_minutes = coalesce(carryover_minutes, 500)
where monthly_minute_limit is null
   or carryover_minutes is null;
