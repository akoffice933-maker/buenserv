-- Transactional Telegram notification outbox for canonical lead lifecycle events.
create type public.notification_outbox_status as enum ('pending', 'processing', 'sent', 'permanently_failed');

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  lead_event_id uuid not null references public.lead_events(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type in ('provider_lead_notification', 'customer_provider_reply')),
  payload jsonb not null default '{}'::jsonb,
  status public.notification_outbox_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  telegram_message_id bigint,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_event_id, notification_type)
);
alter table public.notification_outbox enable row level security;
create index notification_outbox_delivery_idx on public.notification_outbox(status, next_attempt_at, created_at);

-- Replaces the lifecycle RPC to make event creation and notification enqueue atomic.
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

  -- Serialise all lifecycle changes for one lead. The second same-key request observes
  -- the first event after acquiring the lock and returns it instead of duplicating it.
  perform 1 from leads where id = p_lead_id for update;
  if not found then raise exception 'lead_not_found'; end if;
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;

  select event_type into v_last_event from lead_events where lead_id = p_lead_id order by created_at desc limit 1;
  if not (
    (p_event_type = 'customer_contacted' and v_last_event = 'created') or
    (p_event_type = 'provider_notified' and v_last_event = 'customer_contacted') or
    (p_event_type = 'provider_opened' and v_last_event = 'provider_notified') or
    (p_event_type = 'provider_replied' and v_last_event in ('provider_notified', 'provider_opened')) or
    (p_event_type = 'customer_replied' and v_last_event = 'provider_replied') or
    (p_event_type = 'completed' and v_last_event in ('provider_replied', 'customer_replied')) or
    (p_event_type = 'cancelled' and v_last_event not in ('completed', 'cancelled', 'expired')) or
    (p_event_type = 'expired' and v_last_event not in ('completed', 'cancelled', 'expired'))
  ) then raise exception 'invalid_lead_transition: % -> %', v_last_event, p_event_type; end if;

  v_next_status := case
    when p_event_type in ('provider_replied', 'customer_replied') then 'provider_replied'
    when p_event_type = 'completed' then 'success'
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
    completed_at = case when p_event_type = 'completed' then now() else completed_at end,
    updated_at = now()
  where id = p_lead_id;

  if p_event_type = 'provider_notified' then
    select providers.profile_id into v_recipient_profile_id from leads join providers on providers.id = leads.provider_id where leads.id = p_lead_id;
    v_notification_type := 'provider_lead_notification';
  elsif p_event_type = 'provider_replied' then
    select customer_profile_id into v_recipient_profile_id from leads where id = p_lead_id;
    v_notification_type := 'customer_provider_reply';
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

create or replace function public.claim_notification_outbox(p_limit integer default 20)
returns table (id uuid, notification_type text, payload jsonb, telegram_user_id bigint, attempt_count integer)
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
    returning o.id, o.notification_type, o.payload, o.attempt_count, o.recipient_profile_id
  )
  select updated.id, updated.notification_type, updated.payload, profiles.telegram_user_id, updated.attempt_count
  from updated join profiles on profiles.id = updated.recipient_profile_id;
end;
$$;

create or replace function public.complete_notification_outbox(p_id uuid, p_telegram_message_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  update notification_outbox set status = 'sent', sent_at = now(), telegram_message_id = p_telegram_message_id, locked_at = null, last_error = null, updated_at = now()
  where id = p_id and status = 'processing';
end;
$$;

create or replace function public.fail_notification_outbox(p_id uuid, p_error text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update notification_outbox set
    status = case when attempt_count >= 8 then 'permanently_failed' else 'pending' end,
    next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, least(attempt_count, 7))::integer)),
    locked_at = null, last_error = left(coalesce(p_error, 'delivery_failed'), 1000), updated_at = now()
  where id = p_id and status = 'processing';
end;
$$;

revoke all on table public.notification_outbox from public, anon, authenticated;
revoke all on function public.claim_notification_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_notification_outbox(uuid, bigint) from public, anon, authenticated;
revoke all on function public.fail_notification_outbox(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(integer) to service_role;
grant execute on function public.complete_notification_outbox(uuid, bigint) to service_role;
grant execute on function public.fail_notification_outbox(uuid, text) to service_role;
