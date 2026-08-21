alter table projects
  add column if not exists elevenlabs_agent_id text,
  add column if not exists elevenlabs_agent_status text not null default 'not_created'
    check (elevenlabs_agent_status in ('not_created', 'creating', 'created', 'failed')),
  add column if not exists elevenlabs_agent_error text,
  add column if not exists elevenlabs_agent_created_at timestamptz;

create index if not exists projects_elevenlabs_agent_id_idx
  on projects(elevenlabs_agent_id)
  where elevenlabs_agent_id is not null;
