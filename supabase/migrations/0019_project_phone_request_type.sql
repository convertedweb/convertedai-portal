alter table public.projects
  add column if not exists phone_request_type text
  check (phone_request_type in ('hu_21', 'local_company', 'local_private'));

grant update (phone_request_type) on projects to authenticated;
