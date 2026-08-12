-- Lead messages provide the durable conversation layer between customer and provider.
-- They are intentionally separate from lifecycle events, but each message still emits
-- a corresponding lead_event so outbox delivery continues to work unchanged.

create table public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_role public.lead_actor_type not null check (sender_role in ('customer', 'provider')),
  body text not null check (char_length(btrim(body)) > 0 and char_length(body) <= 2000),
  external_source text not null,
  external_id text not null,
  lead_event_id uuid references public.lead_events(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_source, external_id),
  unique (lead_event_id)
);

alter table public.lead_messages enable row level security;
create index lead_messages_lead_created_idx on public.lead_messages(lead_id, created_at);
create index lead_messages_sender_created_idx on public.lead_messages(sender_profile_id, created_at);

alter table public.notification_outbox drop constraint if exists notification_outbox_notification_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_notification_type_check
  check (notification_type in ('provider_lead_notification', 'customer_provider_reply', 'provider_customer_reply'));

create policy "participants can read lead messages" on public.lead_messages
  for select using (
    exists (
      select 1
      from public.leads l
      left join public.profiles customer_profile on customer_profile.id = l.customer_profile_id
      left join public.providers provider on provider.id = l.provider_id
      left join public.profiles provider_profile on provider_profile.id = provider.profile_id
      where l.id = lead_messages.lead_id
        and (
          customer_profile.auth_user_id = auth.uid()
          or provider_profile.auth_user_id = auth.uid()
        )
    )
  );

revoke all on table public.lead_messages from public, anon, authenticated;

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

  -- Lock the lead row before reading lifecycle state to keep message threads ordered.
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
  elsif p_event_type = 'customer_replied' then
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

create or replace function public.send_lead_message(
  p_lead_id uuid,
  p_actor_profile_id uuid,
  p_body text,
  p_external_source text,
  p_external_id text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_event_id uuid;
  v_customer_profile_id uuid;
  v_provider_profile_id uuid;
  v_lead_status public.lead_status;
  v_sender_role public.lead_actor_type;
  v_event_type public.lead_event_type;
  v_body text := btrim(p_body);
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  if v_body is null or char_length(v_body) = 0 then raise exception 'message_body_required'; end if;
  if char_length(v_body) > 2000 then raise exception 'message_body_too_long'; end if;

  select id into v_message_id
  from lead_messages
  where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;

  select l.customer_profile_id, p.profile_id, l.status
  into v_customer_profile_id, v_provider_profile_id, v_lead_status
  from leads l
  join providers p on p.id = l.provider_id
  where l.id = p_lead_id
  for update;

  if not found then raise exception 'lead_not_found'; end if;
  if v_lead_status in ('success', 'cancelled', 'no_response') then raise exception 'lead_closed'; end if;

  if p_actor_profile_id = v_customer_profile_id then
    v_sender_role := 'customer';
    v_event_type := 'customer_replied';
  elsif p_actor_profile_id = v_provider_profile_id then
    v_sender_role := 'provider';
    v_event_type := 'provider_replied';
  else
    raise exception 'not_lead_participant';
  end if;

  v_event_id := public.record_lead_event(
    p_lead_id,
    v_event_type,
    v_sender_role,
    p_actor_profile_id,
    p_external_source,
    p_external_id,
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into lead_messages (
    lead_id,
    sender_profile_id,
    sender_role,
    body,
    external_source,
    external_id,
    lead_event_id,
    metadata
  ) values (
    p_lead_id,
    p_actor_profile_id,
    v_sender_role,
    v_body,
    p_external_source,
    p_external_id,
    v_event_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_message_id;

  return v_message_id;
exception when unique_violation then
  select id into v_message_id
  from lead_messages
  where external_source = p_external_source and external_id = p_external_id;
  if v_message_id is not null then return v_message_id; end if;
  raise;
end;
$$;

revoke all on table public.lead_messages from public, anon, authenticated;
revoke all on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.send_lead_message(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) to service_role;
grant execute on function public.send_lead_message(uuid, uuid, text, text, text, jsonb) to service_role;
