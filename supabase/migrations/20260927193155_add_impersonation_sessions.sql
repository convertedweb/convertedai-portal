create table if not exists public.impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_email text not null,
  target_role text not null check (target_role in ('admin', 'client')),
  token_hash text not null,
  redirect_path text not null check (redirect_path in ('/admin', '/portal')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint impersonation_sessions_different_users check (actor_user_id <> target_user_id)
);

create index if not exists impersonation_sessions_actor_user_id_idx
  on public.impersonation_sessions(actor_user_id, created_at desc);

create index if not exists impersonation_sessions_target_user_id_idx
  on public.impersonation_sessions(target_user_id, created_at desc);

create index if not exists impersonation_sessions_expires_at_idx
  on public.impersonation_sessions(expires_at);

alter table public.impersonation_sessions enable row level security;

revoke all on table public.impersonation_sessions from anon, authenticated;

comment on table public.impersonation_sessions is
  'Service-role-only audit and one-time token storage for superadmin account impersonation.';
