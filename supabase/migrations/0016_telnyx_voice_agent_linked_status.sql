do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
    from pg_constraint
   where conrelid = 'public.projects'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) like '%telnyx_status%'
   limit 1;

  if constraint_name is not null then
    execute format('alter table public.projects drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.projects
  add constraint projects_telnyx_status_check
  check (telnyx_status in ('pending', 'requested', 'connected', 'linked_to_voice_agent', 'failed'));
