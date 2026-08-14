-- ============================================================================
-- BuenServ — Apply migrations 032–041 in DEPENDENCY ORDER (NOT numeric order)
-- ============================================================================
-- Run this in the Supabase SQL Editor (or via psql) against the target database.
-- This file concatenates the migrations in the correct dependency order so the
-- operator does not have to reason about ordering manually.
--
-- Dependency rules:
--   040 (generalize outbox) MUST run before 037/039 (they insert NULL lead rows).
--   041 replaces consume_rate_limit from 038 (off-by-one fix).
--   039 adds customer_support_reply to the check constraint that 037 redefines.
--
-- Before running:
--   1. Verify 037/039 were not partially applied (if so, reconcile first).
--   2. Take a backup.
--   3. Run each block and verify schema/RPC state.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 032_lead_completion_semantics.sql
-- ----------------------------------------------------------------------------
alter type public.lead_event_type add value if not exists 'provider_service_completed' after 'customer_replied';
alter type public.lead_event_type add value if not exists 'customer_completion_confirmed' after 'provider_service_completed';

create or replace function public.record_lead_event(
  p_lead_id uuid,
  p_event_type public.lead_event_type,
  p_actor_type public.lead_actor_type,
  p_actor_profile_id uuid,
  p_external_source text,
  p_external_id text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_last_event public.lead_event_type;
  v_next_status public.lead_status;
  v_recipient_profile_id uuid;
  v_notification_type text;
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;

  perform 1 from leads where id = p_lead_id for update;
  if not found then raise exception 'lead_not_found'; end if;
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;

  select event_type into v_last_event from lead_events where lead_id = p_lead_id order by created_at desc limit 1;
  if not (
    (p_event_type = 'customer_contacted' and v_last_event = 'created') or
    (p_event_type = 'provider_notified' and v_last_event = 'customer_contacted') or
    (p_event_type = 'provider_opened' and v_last_event = 'provider_notified') or
    (p_event_type = 'provider_replied' and v_last_event in ('provider_opened', 'customer_replied')) or
    (p_event_type = 'customer_replied' and v_last_event = 'provider_replied') or
    (p_event_type = 'provider_service_completed' and v_last_event in ('provider_replied', 'customer_replied')) or
    (p_event_type = 'customer_completion_confirmed' and v_last_event = 'provider_service_completed') or
    (p_event_type = 'cancelled' and v_last_event not in ('completed', 'customer_completion_confirmed', 'cancelled', 'expired')) or
    (p_event_type = 'expired' and v_last_event not in ('completed', 'customer_completion_confirmed', 'cancelled', 'expired'))
  ) then raise exception 'invalid_lead_transition: % -> %', v_last_event, p_event_type; end if;

  v_next_status := case
    when p_event_type in ('provider_replied', 'customer_replied', 'provider_service_completed') then 'provider_replied'
    when p_event_type = 'customer_completion_confirmed' then 'success'
    when p_event_type = 'cancelled' then 'cancelled'
    when p_event_type = 'expired' then 'no_response'
    else 'contacted'
  end;

  insert into lead_events (lead_id, event_type, actor_type, actor_profile_id, external_source, external_id, metadata)
  values (p_lead_id, p_event_type, p_actor_type, p_actor_profile_id, p_external_source, p_external_id, p_metadata)
  returning id into v_event_id;

  perform set_config('app.lead_transition', 'record_lead_event', true);
  update leads set status = v_next_status,
    provider_contacted_at = case when p_event_type = 'provider_notified' then now() else provider_contacted_at end,
    provider_replied_at = case when p_event_type = 'provider_replied' then now() else provider_replied_at end,
    completed_at = case when p_event_type = 'customer_completion_confirmed' then now() else completed_at end,
    updated_at = now()
  where id = p_lead_id;

  if p_event_type = 'provider_notified' then
    select providers.profile_id into v_recipient_profile_id from leads join providers on providers.id = leads.provider_id where leads.id = p_lead_id;
    v_notification_type := 'provider_lead_notification';
  elsif p_event_type = 'provider_replied' then
    select customer_profile_id into v_recipient_profile_id from leads where id = p_lead_id;
    v_notification_type := 'customer_provider_reply';
  elsif p_event_type = 'customer_replied' then
    select providers.profile_id into v_recipient_profile_id from leads join providers on providers.id = leads.provider_id where leads.id = p_lead_id;
    v_notification_type := 'provider_customer_reply';
  elsif p_event_type = 'provider_service_completed' then
    select customer_profile_id into v_recipient_profile_id from leads where id = p_lead_id;
    v_notification_type := 'customer_provider_reply';
  elsif p_event_type = 'customer_completion_confirmed' then
    select providers.profile_id into v_recipient_profile_id from leads join providers on providers.id = leads.provider_id where leads.id = p_lead_id;
    v_notification_type := 'provider_customer_reply';
  end if;

  if v_recipient_profile_id is not null then
    insert into notification_outbox (lead_id, lead_event_id, recipient_profile_id, notification_type, payload)
    values (p_lead_id, v_event_id, v_recipient_profile_id, v_notification_type, jsonb_build_object('lead_id', p_lead_id, 'event_type', p_event_type));
  end if;

  return v_event_id;
exception when unique_violation then
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;
  raise;
end;
$$;

revoke all on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- 033_admin_support_reply.sql
-- ----------------------------------------------------------------------------
create table public.support_request_messages (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null references public.support_requests(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'admin', 'moderator', 'support')),
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  external_source text not null,
  external_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (external_source, external_id)
);

alter table public.support_request_messages enable row level security;
create index support_request_messages_request_created_idx on public.support_request_messages(support_request_id, created_at);

create policy "participants can read support messages" on public.support_request_messages
  for select using (
    exists (
      select 1
      from public.support_requests sr
      left join public.profiles customer_profile on customer_profile.id = sr.profile_id
      where sr.id = support_request_messages.support_request_id
        and (
          customer_profile.auth_user_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.auth_user_id = auth.uid() and p.role in ('admin', 'moderator', 'support')
          )
        )
    )
  );

revoke all on table public.support_request_messages from public, anon, authenticated;

create or replace function public.admin_reply_support_request(
  p_actor_profile_id uuid,
  p_request_id uuid,
  p_body text,
  p_external_source text,
  p_external_id text
) returns table (message_id uuid, customer_telegram_user_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_message_id uuid;
  v_customer_telegram_user_id bigint;
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  if char_length(btrim(p_body)) = 0 then raise exception 'message_body_required'; end if;
  if char_length(p_body) > 2000 then raise exception 'message_body_too_long'; end if;

  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator', 'support') then raise exception 'permission_denied'; end if;

  select id into v_message_id from support_request_messages where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then
    select sr.profile_id into v_customer_telegram_user_id from support_requests sr where sr.id = p_request_id;
    return query select v_message_id, (select telegram_user_id from profiles where id = v_customer_telegram_user_id);
    return;
  end if;

  perform 1 from support_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;

  insert into support_request_messages (support_request_id, sender_profile_id, sender_role, body, external_source, external_id)
  values (p_request_id, p_actor_profile_id, v_actor_role, p_body, p_external_source, p_external_id)
  returning id into v_message_id;

  update support_requests set status = 'reviewing', closed_at = null where id = p_request_id and status = 'closed';

  select telegram_user_id into v_customer_telegram_user_id
  from profiles where id = (select profile_id from support_requests where id = p_request_id);

  return query select v_message_id, v_customer_telegram_user_id;
exception when unique_violation then
  select id into v_message_id from support_request_messages where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then
    select telegram_user_id into v_customer_telegram_user_id
    from profiles where id = (select profile_id from support_requests where id = p_request_id);
    return query select v_message_id, v_customer_telegram_user_id;
  end if;
  raise;
end;
$$;

revoke all on function public.admin_reply_support_request(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_reply_support_request(uuid, uuid, text, text, text) to service_role;

-- ----------------------------------------------------------------------------
-- 034_rate_limit_counters.sql
-- ----------------------------------------------------------------------------
create table if not exists public.rate_limit_counters (
  key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_counters enable row level security;
create index if not exists rate_limit_counters_window_idx on public.rate_limit_counters(window_start);

revoke all on table public.rate_limit_counters from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 035_contact_lead_initial_message.sql
-- ----------------------------------------------------------------------------
create or replace function public.create_contact_lead(
  p_customer_profile_id uuid,
  p_provider_id uuid,
  p_category_id uuid,
  p_barrio_id uuid,
  p_description text,
  p_external_source text,
  p_external_id text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_message_id uuid;
  v_event_id uuid;
  v_body text := btrim(coalesce(p_description, ''));
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  if char_length(v_body) > 2000 then raise exception 'message_body_too_long'; end if;

  select id into v_lead_id from leads where external_source = p_external_source and external_id = p_external_id;
  if v_lead_id is not null then return v_lead_id; end if;

  if not exists (select 1 from providers where id = p_provider_id and status = 'approved') then raise exception 'provider_not_found'; end if;

  insert into leads (customer_profile_id, provider_id, category_id, barrio_id, source, source_detail, external_source, external_id, status, telegram_started_at)
  values (p_customer_profile_id, p_provider_id, p_category_id, p_barrio_id, 'mini_app', 'customer_contact', p_external_source, p_external_id, 'created', now())
  returning id into v_lead_id;

  v_event_id := public.record_lead_event(
    v_lead_id, 'customer_contacted', 'customer', p_customer_profile_id,
    p_external_source, p_external_id || ':customer_contacted', coalesce(p_metadata, '{}'::jsonb)
  );

  if char_length(v_body) > 0 then
    insert into lead_messages (lead_id, sender_profile_id, sender_role, body, external_source, external_id, lead_event_id, metadata)
    values (v_lead_id, p_customer_profile_id, 'customer', v_body, p_external_source, p_external_id || ':initial_message', v_event_id, coalesce(p_metadata, '{}'::jsonb))
    returning id into v_message_id;
  end if;

  perform public.record_lead_event(
    v_lead_id, 'provider_notified', 'system', null,
    p_external_source, p_external_id || ':provider_notified', coalesce(p_metadata, '{}'::jsonb)
  );

  return v_lead_id;
exception when unique_violation then
  select id into v_lead_id from leads where external_source = p_external_source and external_id = p_external_id;
  if v_lead_id is not null then return v_lead_id; end if;
  raise;
end;
$$;

revoke all on function public.create_contact_lead(uuid, uuid, uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_contact_lead(uuid, uuid, uuid, uuid, text, text, text, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- 036_completion_notification_types.sql
-- ----------------------------------------------------------------------------
alter table public.notification_outbox drop constraint if exists notification_outbox_notification_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_notification_type_check
  check (notification_type in (
    'provider_lead_notification',
    'customer_provider_reply',
    'provider_customer_reply',
    'customer_provider_completed',
    'provider_customer_confirmed'
  ));

create or replace function public.record_lead_event(
  p_lead_id uuid,
  p_event_type public.lead_event_type,
  p_actor_type public.lead_actor_type,
  p_actor_profile_id uuid,
  p_external_source text,
  p_external_id text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_last_event public.lead_event_type;
  v_next_status public.lead_status;
  v_recipient_profile_id uuid;
  v_notification_type text;
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;

  perform 1 from leads where id = p_lead_id for update;
  if not found then raise exception 'lead_not_found'; end if;
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;

  select event_type into v_last_event from lead_events where lead_id = p_lead_id order by created_at desc limit 1;
  if not (
    (p_event_type = 'customer_contacted' and v_last_event = 'created') or
    (p_event_type = 'provider_notified' and v_last_event = 'customer_contacted') or
    (p_event_type = 'provider_opened' and v_last_event = 'provider_notified') or
    (p_event_type = 'provider_replied' and v_last_event in ('provider_opened', 'customer_replied')) or
    (p_event_type = 'customer_replied' and v_last_event = 'provider_replied') or
    (p_event_type = 'provider_service_completed' and v_last_event in ('provider_replied', 'customer_replied')) or
    (p_event_type = 'customer_completion_confirmed' and v_last_event = 'provider_service_completed') or
    (p_event_type = 'cancelled' and v_last_event not in ('completed', 'customer_completion_confirmed', 'cancelled', 'expired')) or
    (p_event_type = 'expired' and v_last_event not in ('completed', 'customer_completion_confirmed', 'cancelled', 'expired'))
  ) then raise exception 'invalid_lead_transition: % -> %', v_last_event, p_event_type; end if;

  v_next_status := case
    when p_event_type in ('provider_replied', 'customer_replied', 'provider_service_completed') then 'provider_replied'
    when p_event_type = 'customer_completion_confirmed' then 'success'
    when p_event_type = 'cancelled' then 'cancelled'
    when p_event_type = 'expired' then 'no_response'
    else 'contacted'
  end;

  insert into lead_events (lead_id, event_type, actor_type, actor_profile_id, external_source, external_id, metadata)
  values (p_lead_id, p_event_type, p_actor_type, p_actor_profile_id, p_external_source, p_external_id, p_metadata)
  returning id into v_event_id;

  perform set_config('app.lead_transition', 'record_lead_event', true);
  update leads set status = v_next_status,
    provider_contacted_at = case when p_event_type = 'provider_notified' then now() else provider_contacted_at end,
    provider_replied_at = case when p_event_type = 'provider_replied' then now() else provider_replied_at end,
    completed_at = case when p_event_type = 'customer_completion_confirmed' then now() else completed_at end,
    updated_at = now()
  where id = p_lead_id;

  if p_event_type = 'provider_notified' then
    select providers.profile_id into v_recipient_profile_id from leads join providers on providers.id = leads.provider_id where leads.id = p_lead_id;
    v_notification_type := 'provider_lead_notification';
  elsif p_event_type = 'provider_replied' then
    select customer_profile_id into v_recipient_profile_id from leads where id = p_lead_id;
    v_notification_type := 'customer_provider_reply';
  elsif p_event_type = 'customer_replied' then
    select providers.profile_id into v_recipient_profile_id from leads join providers on providers.id = leads.provider_id where leads.id = p_lead_id;
    v_notification_type := 'provider_customer_reply';
  elsif p_event_type = 'provider_service_completed' then
    select customer_profile_id into v_recipient_profile_id from leads where id = p_lead_id;
    v_notification_type := 'customer_provider_completed';
  elsif p_event_type = 'customer_completion_confirmed' then
    select providers.profile_id into v_recipient_profile_id from leads join providers on providers.id = leads.provider_id where leads.id = p_lead_id;
    v_notification_type := 'provider_customer_confirmed';
  end if;

  if v_recipient_profile_id is not null then
    insert into notification_outbox (lead_id, lead_event_id, recipient_profile_id, notification_type, payload)
    values (p_lead_id, v_event_id, v_recipient_profile_id, v_notification_type, jsonb_build_object('lead_id', p_lead_id, 'event_type', p_event_type));
  end if;

  return v_event_id;
exception when unique_violation then
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;
  raise;
end;
$$;

revoke all on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) to service_role;

-- ----------------------------------------------------------------------------
-- 040_generalize_notification_outbox.sql  (BEFORE 037/039)
-- ----------------------------------------------------------------------------
alter table public.notification_outbox alter column lead_id drop not null;
alter table public.notification_outbox alter column lead_event_id drop not null;

alter table public.notification_outbox drop constraint if exists notification_outbox_notification_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_notification_type_check
  check (
    (
      notification_type in (
        'provider_lead_notification',
        'customer_provider_reply',
        'provider_customer_reply',
        'customer_provider_completed',
        'provider_customer_confirmed'
      )
      and lead_id is not null
      and lead_event_id is not null
    )
    or
    (
      notification_type in (
        'admin_new_support_request',
        'admin_new_report',
        'admin_outbox_failed',
        'customer_support_reply'
      )
      and lead_id is null
      and lead_event_id is null
    )
  );

-- ----------------------------------------------------------------------------
-- 037_admin_alert_delivery_channel.sql
-- ----------------------------------------------------------------------------
alter table public.notification_outbox add column if not exists bot_kind text not null default 'public_bot' check (bot_kind in ('public_bot', 'admin_bot'));

alter table public.notification_outbox drop constraint if exists notification_outbox_notification_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_notification_type_check
  check (notification_type in (
    'provider_lead_notification',
    'customer_provider_reply',
    'provider_customer_reply',
    'customer_provider_completed',
    'provider_customer_confirmed',
    'admin_new_support_request',
    'admin_new_report',
    'admin_outbox_failed'
  ));

create or replace function public.enqueue_admin_alert(
  p_notification_type text,
  p_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid;
  v_outbox_id uuid;
begin
  if p_notification_type not in ('admin_new_support_request', 'admin_new_report', 'admin_outbox_failed') then
    raise exception 'invalid_admin_notification_type';
  end if;

  select id into v_admin_profile_id from profiles where role = 'admin' order by created_at asc limit 1;
  if v_admin_profile_id is null then return null; end if;

  insert into notification_outbox (lead_id, lead_event_id, recipient_profile_id, notification_type, payload, bot_kind)
  values (null, null, v_admin_profile_id, p_notification_type, coalesce(p_payload, '{}'::jsonb), 'admin_bot')
  returning id into v_outbox_id;

  return v_outbox_id;
end;
$$;

revoke all on function public.enqueue_admin_alert(text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_admin_alert(text, jsonb) to service_role;

drop function if exists public.claim_notification_outbox(integer);
create or replace function public.claim_notification_outbox(p_limit integer default 20)
returns table (id uuid, notification_type text, payload jsonb, telegram_user_id bigint, attempt_count integer, bot_kind text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with claimed as (
    select o.id from notification_outbox o
    where (o.status = 'pending' and o.next_attempt_at <= now())
       or (o.status = 'processing' and o.locked_at < now() - interval '10 minutes')
    order by o.created_at
    for update skip locked
    limit greatest(1, least(p_limit, 100))
  ), updated as (
    update notification_outbox o set status = 'processing', locked_at = now(), attempt_count = o.attempt_count + 1, updated_at = now()
    from claimed where o.id = claimed.id
    returning o.id, o.notification_type, o.payload, o.attempt_count, o.recipient_profile_id, o.bot_kind
  )
  select updated.id, updated.notification_type, updated.payload, profiles.telegram_user_id, updated.attempt_count, updated.bot_kind
  from updated join profiles on profiles.id = updated.recipient_profile_id;
end;
$$;

revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;

create or replace function public.fail_notification_outbox(p_id uuid, p_error text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_new_status text;
  v_bot_kind text;
begin
  select bot_kind into v_bot_kind from notification_outbox where id = p_id;
  update notification_outbox set
    status = case when attempt_count >= 8 then 'permanently_failed' else 'pending' end,
    next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, least(attempt_count, 7))::integer)),
    locked_at = null, last_error = left(coalesce(p_error, 'delivery_failed'), 1000), updated_at = now()
  where id = p_id and status = 'processing'
  returning status into v_new_status;

  if v_new_status = 'permanently_failed' and v_bot_kind = 'public_bot' then
    perform public.enqueue_admin_alert('admin_outbox_failed', jsonb_build_object('outbox_id', p_id, 'error', left(coalesce(p_error, 'delivery_failed'), 200)));
  end if;
end;
$$;

revoke all on function public.fail_notification_outbox(uuid, text) from public, anon, authenticated;
grant execute on function public.fail_notification_outbox(uuid, text) to service_role;

-- ----------------------------------------------------------------------------
-- 038_atomic_rate_limit_rpc.sql
-- ----------------------------------------------------------------------------
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or p_key = '' then raise exception 'key_required'; end if;
  if p_limit is null or p_limit < 1 then raise exception 'limit_required'; end if;
  if p_window_seconds is null or p_window_seconds < 1 then raise exception 'window_required'; end if;

  v_window_start := v_now - make_interval(secs => p_window_seconds);

  insert into rate_limit_counters (key, count, window_start, updated_at)
  values (p_key, 1, v_now, v_now)
  on conflict (key) do update set
    count = case
      when rate_limit_counters.window_start < v_window_start then 1
      else rate_limit_counters.count + 1
    end,
    window_start = case
      when rate_limit_counters.window_start < v_window_start then v_now
      else rate_limit_counters.window_start
    end,
    updated_at = v_now
  returning (case
      when rate_limit_counters.window_start < v_window_start then 1
      else rate_limit_counters.count + 1
    end), (case
      when rate_limit_counters.window_start < v_window_start then v_now
      else rate_limit_counters.window_start
    end)
  into v_count, v_window_start;

  if v_count <= p_limit then
    return query select true, 0;
  else
    return query select false, greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::integer);
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- ----------------------------------------------------------------------------
-- 039_support_reply_outbox_and_immutability.sql
-- ----------------------------------------------------------------------------
create or replace function public.prevent_support_message_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'support_request_messages are immutable';
end;
$$;

drop trigger if exists support_request_messages_immutable on public.support_request_messages;
create trigger support_request_messages_immutable
  before update or delete on public.support_request_messages
  for each row execute function public.prevent_support_message_mutation();

drop function if exists public.admin_reply_support_request(uuid, uuid, text, text, text);
create or replace function public.admin_reply_support_request(
  p_actor_profile_id uuid,
  p_request_id uuid,
  p_body text,
  p_external_source text,
  p_external_id text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_message_id uuid;
  v_customer_profile_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  if char_length(v_body) = 0 then raise exception 'message_body_required'; end if;
  if char_length(v_body) > 2000 then raise exception 'message_body_too_long'; end if;

  select role into v_actor_role from profiles where id = p_actor_profile_id;
  if v_actor_role not in ('admin', 'moderator', 'support') then raise exception 'permission_denied'; end if;

  select id into v_message_id from support_request_messages where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;

  perform 1 from support_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;

  select profile_id into v_customer_profile_id from support_requests where id = p_request_id;
  if v_customer_profile_id is null then raise exception 'request_has_no_customer'; end if;

  insert into support_request_messages (support_request_id, sender_profile_id, sender_role, body, external_source, external_id)
  values (p_request_id, p_actor_profile_id, v_actor_role, v_body, p_external_source, p_external_id)
  returning id into v_message_id;

  update support_requests set status = 'reviewing', closed_at = null where id = p_request_id and status = 'closed';

  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'admin_replied_support', 'support_request', p_request_id,
          jsonb_build_object('message_id', v_message_id, 'profile_id', v_customer_profile_id));

  insert into notification_outbox (recipient_profile_id, notification_type, payload, bot_kind)
  values (v_customer_profile_id, 'customer_support_reply', jsonb_build_object('support_request_id', p_request_id, 'body', v_body), 'public_bot');

  return v_message_id;
exception when unique_violation then
  select id into v_message_id from support_request_messages where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;
  raise;
end;
$$;

revoke all on function public.admin_reply_support_request(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_reply_support_request(uuid, uuid, text, text, text) to service_role;

alter table public.notification_outbox drop constraint if exists notification_outbox_notification_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_notification_type_check
  check (notification_type in (
    'provider_lead_notification',
    'customer_provider_reply',
    'provider_customer_reply',
    'customer_provider_completed',
    'provider_customer_confirmed',
    'admin_new_support_request',
    'admin_new_report',
    'admin_outbox_failed',
    'customer_support_reply'
  ));

-- ----------------------------------------------------------------------------
-- 041_fix_atomic_rate_limit_return.sql
-- ----------------------------------------------------------------------------
create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or p_key = '' then raise exception 'key_required'; end if;
  if p_limit is null or p_limit < 1 then raise exception 'limit_required'; end if;
  if p_window_seconds is null or p_window_seconds < 1 then raise exception 'window_required'; end if;

  v_window_start := v_now - make_interval(secs => p_window_seconds);

  insert into rate_limit_counters (key, count, window_start, updated_at)
  values (p_key, 1, v_now, v_now)
  on conflict (key) do update set
    count = case
      when rate_limit_counters.window_start < v_window_start then 1
      else rate_limit_counters.count + 1
    end,
    window_start = case
      when rate_limit_counters.window_start < v_window_start then v_now
      else rate_limit_counters.window_start
    end,
    updated_at = v_now
  returning count, window_start
  into v_count, v_window_start;

  if v_count <= p_limit then
    return query select true, 0;
  else
    return query select false, greatest(1, ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now)))::integer);
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- ============================================================================
-- END — verify with:
--   select to_regclass('public.support_request_messages');
--   select to_regclass('public.rate_limit_counters');
--   select proname from pg_proc where proname in ('create_contact_lead','enqueue_admin_alert','consume_rate_limit','admin_reply_support_request');
-- ============================================================================