-- Lead Call termék: projektenkénti beállítások, kampány-téma a leadforrásokon,
-- és egy PII-mentes eseménytábla (duplikáció- és stop-ellenőrzéshez).
-- Lead-adat (név, telefon, e-mail) nem kerül adatbázisba; a lead azonosítója csak SHA-256 lenyomat.
-- Az írás kizárólag szerveroldali (service-role) klienssel történik.

-- 1. Kampány-téma a leadforrásokon (a first message-be kerülő, ragozható kifejezés)
alter table lead_sources
  add column campaign_topic text
    check (campaign_topic is null or char_length(btrim(campaign_topic)) between 1 and 200);

-- 2. Lead Call projekt-beállítások (projektenként legfeljebb egy sor)
create table lead_call_settings (
  project_id uuid primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  enabled boolean not null default false,
  company_display_name text
    check (company_display_name is null or char_length(btrim(company_display_name)) between 1 and 200),
  expert_name text
    check (expert_name is null or char_length(btrim(expert_name)) between 1 and 200),
  expert_title text
    check (expert_title is null or char_length(btrim(expert_title)) between 1 and 200),
  notify_emails text[] not null default '{}'
    check (cardinality(notify_emails) <= 10),
  calendar_id text
    check (calendar_id is null or char_length(btrim(calendar_id)) between 1 and 300),
  meeting_link text
    check (meeting_link is null or (char_length(meeting_link) between 8 and 500 and meeting_link ~* '^https://')),
  business_hours jsonb not null default '{
    "timezone": "Europe/Budapest",
    "days": {
      "mon": [{"start": "09:00", "end": "17:00"}],
      "tue": [{"start": "09:00", "end": "17:00"}],
      "wed": [{"start": "09:00", "end": "17:00"}],
      "thu": [{"start": "09:00", "end": "17:00"}],
      "fri": [{"start": "09:00", "end": "17:00"}],
      "sat": [],
      "sun": []
    }
  }'::jsonb
    check (jsonb_typeof(business_hours) = 'object'),
  elevenlabs_phone_number_id text
    check (elevenlabs_phone_number_id is null or char_length(btrim(elevenlabs_phone_number_id)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, organization_id),
  foreign key (project_id, organization_id)
    references projects(id, organization_id) on delete cascade
);

create index lead_call_settings_organization_idx
  on lead_call_settings(organization_id);

-- 3. PII-mentes lead-állapot: leadenként (projekten belül) egy sor
create table lead_call_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null,
  lead_id_hash text not null check (lead_id_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'received'
    check (status in ('received', 'calling', 'retry_pending', 'completed', 'failed', 'skipped', 'do_not_call')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  conversation_id text
    check (conversation_id is null or char_length(conversation_id) between 1 and 200),
  booked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, lead_id_hash),
  foreign key (project_id, organization_id)
    references projects(id, organization_id) on delete cascade
);

create index lead_call_events_project_created_idx
  on lead_call_events(project_id, created_at desc);

create trigger lead_call_settings_set_updated_at
  before update on lead_call_settings
  for each row execute function public.set_row_updated_at();

create trigger lead_call_events_set_updated_at
  before update on lead_call_events
  for each row execute function public.set_row_updated_at();

alter table lead_call_settings enable row level security;
alter table lead_call_events enable row level security;

-- Közvetlen írás nincs: csak olvasás az authenticated szerepkörnek, írás a service-role klienssel.
revoke all on lead_call_settings from anon, authenticated;
revoke all on lead_call_events from anon, authenticated;
grant select on lead_call_settings to authenticated;
grant select on lead_call_events to authenticated;

create policy "authorized users can view lead call settings"
  on lead_call_settings for select to authenticated
  using (
    exists (
      select 1 from org_members
      where org_members.organization_id = lead_call_settings.organization_id
        and org_members.user_id = (select auth.uid())
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
    or (
      exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'admin'
      )
      and exists (
        select 1 from organizations
        where organizations.id = lead_call_settings.organization_id
          and organizations.superadmin_only = false
          and organizations.deleted_at is null
      )
    )
  );

create policy "authorized users can view lead call events"
  on lead_call_events for select to authenticated
  using (
    exists (
      select 1 from org_members
      where org_members.organization_id = lead_call_events.organization_id
        and org_members.user_id = (select auth.uid())
    )
    or exists (
      select 1 from super_admins
      where super_admins.user_id = (select auth.uid())
    )
    or (
      exists (
        select 1 from admin_roles
        where admin_roles.user_id = (select auth.uid())
          and admin_roles.role = 'admin'
      )
      and exists (
        select 1 from organizations
        where organizations.id = lead_call_events.organization_id
          and organizations.superadmin_only = false
          and organizations.deleted_at is null
      )
    )
  );
