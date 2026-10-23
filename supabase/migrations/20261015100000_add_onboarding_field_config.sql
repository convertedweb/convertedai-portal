-- Lépésenként kiválasztott onboarding mezők, pl. {"assistant": ["agentName", "greeting"]}; a kulcsokat az alkalmazás validálja.
-- Üres objektum = alapértelmezett mezők. Írás csak szerveroldali admin klienssel.
alter table projects
  add column onboarding_field_config jsonb not null default '{}'::jsonb;
