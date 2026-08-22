alter table projects
  add column if not exists agent_language text not null default 'hu',
  add column if not exists agent_style text not null default 'receptionist',
  add column if not exists agent_tone text not null default 'friendly';

grant insert (agent_language, agent_style, agent_tone, greeting, call_instructions, handoff_instructions) on projects to authenticated;
grant update (agent_language, agent_style, agent_tone) on projects to authenticated;
