alter table public.projects
  add column if not exists phone_documents_received boolean not null default false;

grant update (phone_documents_received) on projects to authenticated;
