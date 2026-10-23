-- A 0011-es szabályban a `name` a subquery-ben a projects.name oszlopra oldódott fel (projektnév),
-- ezért az ügyfél-feltöltés és -letöltés sosem teljesülhetett. Itt a storage.objects.name-re hivatkozunk.
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
       where projects.id = ((storage.foldername(objects.name))[1])::uuid
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
       where projects.id = ((storage.foldername(objects.name))[1])::uuid
         and org_members.user_id = (select auth.uid())
         and projects.deleted_at is null
    )
  );
