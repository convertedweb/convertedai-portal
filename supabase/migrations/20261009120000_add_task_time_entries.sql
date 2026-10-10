-- Belső admin időmérés: csak a szerveroldali admin kliens éri el (nincs policy az authenticated szerepnek).
create table public.task_time_entries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);

create index task_time_entries_task_idx on public.task_time_entries (task_id, started_at desc);
-- Felhasználónként egyszerre egy futó időmérő.
create unique index task_time_entries_one_running_idx on public.task_time_entries (user_id) where ended_at is null;

alter table public.task_time_entries enable row level security;
revoke all on public.task_time_entries from anon, authenticated;
