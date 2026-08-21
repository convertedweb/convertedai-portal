alter table projects
  add column if not exists greeting text,
  add column if not exists call_instructions text,
  add column if not exists handoff_instructions text,
  add column if not exists telnyx_status text not null default 'pending'
    check (telnyx_status in ('pending', 'requested', 'connected', 'failed'));

grant update (agent_display_name, greeting, call_instructions, handoff_instructions, updated_at) on projects to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-base',
  'knowledge-base',
  false,
  52428800,
  array[
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

grant insert on documents to authenticated;

drop policy if exists "members can insert organization documents" on documents;

create policy "members can insert organization documents"
  on documents for insert to authenticated
  with check (exists (
    select 1
      from org_members
     where org_members.organization_id = documents.organization_id
       and org_members.user_id = (select auth.uid())
  ));

drop policy if exists "members can upload knowledge base files" on storage.objects;
drop policy if exists "members can view knowledge base files" on storage.objects;

create policy "members can upload knowledge base files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'knowledge-base'
    and exists (
      select 1
        from projects
        join org_members on org_members.organization_id = projects.organization_id
       where projects.id = ((storage.foldername(name))[1])::uuid
         and org_members.user_id = (select auth.uid())
         and projects.deleted_at is null
    )
  );

create policy "members can view knowledge base files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'knowledge-base'
    and exists (
      select 1
        from projects
        join org_members on org_members.organization_id = projects.organization_id
       where projects.id = ((storage.foldername(name))[1])::uuid
         and org_members.user_id = (select auth.uid())
         and projects.deleted_at is null
    )
  );
