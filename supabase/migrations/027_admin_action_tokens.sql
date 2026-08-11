-- Admin action tokens: server-issued expiring tokens for admin bot inline actions.
-- Prevents replay attacks, stale button presses, and entity ID spoofing.
create table public.admin_action_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  action_type text not null,
  entity_type text not null,
  entity_id text not null,
  issued_for_profile_id uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_action_tokens_token on public.admin_action_tokens(token);
create index idx_admin_action_tokens_issued_for on public.admin_action_tokens(issued_for_profile_id);
create index idx_admin_action_tokens_expires on public.admin_action_tokens(expires_at);

alter table public.admin_action_tokens enable row level security;

-- Admin panel state: persists the current view for each admin
create table public.admin_panel_states (
  profile_id uuid primary key references public.profiles(id),
  current_view text not null default 'panel',
  context jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.admin_panel_states enable row level security;

revoke all on table public.admin_action_tokens from public, anon, authenticated;
revoke all on table public.admin_panel_states from public, anon, authenticated;