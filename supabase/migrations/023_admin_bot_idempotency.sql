-- Separate idempotency boundary for the privileged admin Telegram bot.
create table public.admin_telegram_updates (
  update_id bigint primary key,
  processed_at timestamptz,
  received_at timestamptz not null default now()
);
alter table public.admin_telegram_updates enable row level security;
