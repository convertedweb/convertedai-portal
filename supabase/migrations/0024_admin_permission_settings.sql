create table if not exists admin_permission_settings (
  role text primary key check (role = 'admin'),
  can_view_customers boolean not null default true,
  can_create_customers boolean not null default true,
  can_edit_customers boolean not null default true,
  can_invite_customer_users boolean not null default true,
  can_view_projects boolean not null default true,
  can_view_phone_numbers boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into admin_permission_settings (
  role,
  can_view_customers,
  can_create_customers,
  can_edit_customers,
  can_invite_customer_users,
  can_view_projects,
  can_view_phone_numbers
)
values ('admin', true, true, true, true, true, true)
on conflict (role) do nothing;

alter table admin_permission_settings enable row level security;

grant select on admin_permission_settings to authenticated;

drop policy if exists "admin roles can view permission settings" on admin_permission_settings;
drop policy if exists "super admins can view permission settings" on admin_permission_settings;

create policy "admin roles can view permission settings"
  on admin_permission_settings for select to authenticated
  using (exists (
    select 1
      from admin_roles
     where admin_roles.user_id = (select auth.uid())
       and admin_roles.role in ('superadmin', 'admin')
  ));

create policy "super admins can view permission settings"
  on admin_permission_settings for select to authenticated
  using (exists (
    select 1
      from super_admins
     where super_admins.user_id = (select auth.uid())
  ));
