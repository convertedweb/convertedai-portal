-- Tudásbázis forrás URL-ek (weboldal vagy más oldal, ahonnan tartalmat importálunk).
-- Írás és olvasás csak szerveroldali admin klienssel, az alkalmazás jogosultság-ellenőrzése után.
create table knowledge_urls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null,
  url text not null check (char_length(url) between 8 and 2000 and url ~* '^https?://'),
  note text check (note is null or char_length(note) <= 300),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (project_id, organization_id)
    references projects(id, organization_id) on delete cascade
);

create index knowledge_urls_project_idx
  on knowledge_urls(project_id, created_at desc)
  where deleted_at is null;

create unique index knowledge_urls_project_url_idx
  on knowledge_urls(project_id, url)
  where deleted_at is null;

alter table knowledge_urls enable row level security;

revoke all on knowledge_urls from anon, authenticated;
