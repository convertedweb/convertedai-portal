create or replace function public.admin_customer_members(p_organization_ids uuid[])
returns table (
  id uuid,
  organization_id uuid,
  user_id uuid,
  name text,
  email text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    org_members.id,
    org_members.organization_id,
    org_members.user_id,
    coalesce(
      nullif(auth.users.raw_user_meta_data ->> 'full_name', ''),
      nullif(auth.users.raw_user_meta_data ->> 'name', ''),
      split_part(auth.users.email, '@', 1),
      'Nincs nev'
    ) as name,
    coalesce(auth.users.email, 'Nincs e-mail') as email,
    org_members.role,
    org_members.created_at
  from public.org_members
  join auth.users on auth.users.id = org_members.user_id
  where org_members.organization_id = any(p_organization_ids)
    and exists (
      select 1
        from public.super_admins
       where super_admins.user_id = (select auth.uid())
    );
$$;

revoke all on function public.admin_customer_members(uuid[]) from public;
grant execute on function public.admin_customer_members(uuid[]) to authenticated;
