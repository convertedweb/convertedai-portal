alter table projects
  add column if not exists prompt_assets_received boolean not null default false,
  add column if not exists knowledge_assets_received boolean not null default false;

grant update (prompt_assets_received, knowledge_assets_received) on projects to authenticated;
