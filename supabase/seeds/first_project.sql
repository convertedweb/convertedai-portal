-- First tenant/project seed for local MVP validation.
-- Replace __LOGIN_EMAIL__ with the email address used for Supabase magic-link login,
-- then run this file in the Supabase SQL Editor after migrations 0001 and 0002.

do $$
declare
  target_email text := 'honorbert@gmail.com';
  target_user_id uuid;
  target_org_id uuid;
  target_project_id uuid;
begin
  select id
    into target_user_id
    from auth.users
   where email = target_email
   order by created_at desc
   limit 1;

  if target_user_id is null then
    raise exception 'No Supabase auth user found for email: %', target_email;
  end if;

  insert into organizations (name, slug, status)
  values ('ConvertedAI Demo', 'convertedai-demo', 'active')
  on conflict (slug) do update
    set name = excluded.name,
        status = excluded.status,
        updated_at = now()
  returning id into target_org_id;

  insert into org_members (organization_id, user_id, role)
  values (target_org_id, target_user_id, 'client_owner')
  on conflict (organization_id, user_id) do update
    set role = excluded.role;

  insert into projects (organization_id, name, agent_display_name, phone_number, status)
  values (
    target_org_id,
    'ConvertedAI Voice Agent MVP',
    'Lili, a ConvertedAI telefonos asszisztense',
    null,
    'building'
  )
  on conflict do nothing
  returning id into target_project_id;

  if target_project_id is null then
    select id
      into target_project_id
      from projects
     where organization_id = target_org_id
       and name = 'ConvertedAI Voice Agent MVP'
       and deleted_at is null
     order by created_at desc
     limit 1;
  end if;

  insert into documents (organization_id, project_id, category, file_name, storage_path, mime_type, size_bytes, processing_status)
  values
    (target_org_id, target_project_id, 'knowledge_base', 'gyik-minta.pdf', 'demo/gyik-minta.pdf', 'application/pdf', 128000, 'ready'),
    (target_org_id, target_project_id, 'call_script', 'hivaskezelesi-forgatokonyv.md', 'demo/hivaskezelesi-forgatokonyv.md', 'text/markdown', 24000, 'ready')
  on conflict do nothing;
end $$;
