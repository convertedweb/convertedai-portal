-- Ügyfelenként legfeljebb 1 tulajdonos (client_owner) és 2 munkatárs (client_member).
-- A meglévő adatok megfelelnek ennek (ellenőrizve a bevezetés előtt).
create unique index org_members_one_owner_idx
  on public.org_members (organization_id)
  where role = 'client_owner';

create or replace function public.enforce_org_member_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'client_member' then
    -- Az ügyfél sorának zárolása, hogy párhuzamos beszúrások se léphessék át a limitet.
    perform 1 from organizations where id = new.organization_id for update;
    if (
      select count(*) from org_members
      where organization_id = new.organization_id
        and role = 'client_member'
        and id is distinct from new.id
    ) >= 2 then
      raise exception 'org_member_limit: egy ügyfélhez legfeljebb 2 munkatárs rendelhető'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_org_member_limit() from public;

create trigger org_members_enforce_limit
  before insert or update of role, organization_id on public.org_members
  for each row execute function public.enforce_org_member_limit();
