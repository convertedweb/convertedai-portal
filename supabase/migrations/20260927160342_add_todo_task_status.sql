alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('backlog', 'todo', 'planned', 'in_progress', 'waiting_client', 'review', 'done', 'archived'));
