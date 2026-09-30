alter table projects
  drop constraint if exists projects_category_check;

alter table projects
  add constraint projects_category_check
  check (category in ('chatbot', 'voice_agent', 'meta_lead_caller', 'automation', 'ui_ux_design', 'website'));
