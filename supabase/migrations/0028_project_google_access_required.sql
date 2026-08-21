alter table projects
  add column if not exists google_access_required boolean not null default true;

grant update (google_access_required) on projects to authenticated;
