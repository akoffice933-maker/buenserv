-- Persist the moderated provider submission after Telegram onboarding confirmation.
alter table public.providers add column if not exists bio text;
alter table public.providers add column if not exists onboarding_payload jsonb not null default '{}'::jsonb;

alter table public.providers add constraint providers_bio_length check (bio is null or char_length(bio) between 20 and 800);
