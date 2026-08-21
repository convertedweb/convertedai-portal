alter table projects
  add column if not exists category text not null default 'voice_agent'
  check (category in ('chatbot', 'voice_agent', 'automation'));
