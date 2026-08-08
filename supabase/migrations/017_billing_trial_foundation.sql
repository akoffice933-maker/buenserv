-- Billing/trial data foundation. No payment collection or automatic charging is enabled by this migration.
create type public.billing_trial_status as enum ('draft', 'active', 'paused', 'ended', 'cancelled');
create type public.billing_event_type as enum ('trial_started', 'trial_ended', 'subscription_created', 'subscription_cancelled', 'invoice_created', 'payment_confirmed', 'refund_issued');

create table public.provider_billing_trials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references public.providers(id) on delete cascade,
  offer_version text not null,
  status public.billing_trial_status not null default 'draft',
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and started_at is not null and ends_at is not null) or status <> 'active'),
  check (ends_at is null or started_at is null or ends_at > started_at)
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  trial_id uuid references public.provider_billing_trials(id) on delete set null,
  event_type public.billing_event_type not null,
  amount_ars numeric(14,2),
  external_reference text unique,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.provider_billing_trials enable row level security;
alter table public.billing_events enable row level security;
create index billing_events_provider_created_idx on public.billing_events(provider_id, created_at desc);
