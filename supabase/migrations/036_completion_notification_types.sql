-- P0-2: completion events must use completion-specific notification types, not the
-- generic reply types. Otherwise a customer gets "provider replied" when the provider
-- actually marked the service as done, and vice versa.

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

-- Replaces record_lead_event so completion events enqueue the correct notification type.
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
    (p_event_type = 'cancelled' and v_last_event not in ('success', 'cancelled', 'expired')) or
    (p_event_type = 'expired' and v_last_event not in ('success', 'cancelled', 'expired'))
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
