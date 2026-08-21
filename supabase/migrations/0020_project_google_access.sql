alter table projects
  add column if not exists google_account_email text,
  add column if not exists google_password_share_url text,
  add column if not exists google_access_confirmed boolean not null default false,
  add column if not exists google_access_status text not null default 'not_provided'
    check (google_access_status in ('not_provided', 'submitted', 'checking', 'working', 'failed'));

grant update (google_account_email, google_password_share_url, google_access_confirmed, google_access_status) on projects to authenticated;
