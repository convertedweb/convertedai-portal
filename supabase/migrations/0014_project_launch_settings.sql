alter table projects
  add column if not exists planned_launch_date date,
  add column if not exists launched_at timestamptz;
