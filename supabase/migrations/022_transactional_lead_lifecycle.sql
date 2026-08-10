-- Canonical transactional write path for lead creation and immutable lifecycle events.
create or replace function public.create_lead(
  p_customer_profile_id uuid,
  p_provider_id uuid,
  p_category_id uuid,
  p_barrio_id uuid,
  p_source text,
  p_source_detail text,
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
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  select id into v_lead_id from leads where external_source = p_external_source and external_id = p_external_id;
  if v_lead_id is not null then return v_lead_id; end if;
  if not exists (select 1 from providers where id = p_provider_id and status = 'approved') then raise exception 'provider_not_found'; end if;
  insert into leads (customer_profile_id, provider_id, category_id, barrio_id, source, source_detail, external_source, external_id, status, telegram_started_at)
  values (p_customer_profile_id, p_provider_id, p_category_id, p_barrio_id, p_source, p_source_detail, p_external_source, p_external_id, 'created', now())
  returning id into v_lead_id;
  insert into lead_events (lead_id, event_type, actor_type, actor_profile_id, external_source, external_id, metadata)
  values (v_lead_id, 'created', 'customer', p_customer_profile_id, p_external_source, p_external_id, p_metadata);
  return v_lead_id;
end;
$$;

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
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  select id into v_event_id from lead_events where external_source = p_external_source and external_id = p_external_id;
  if v_event_id is not null then return v_event_id; end if;
  perform 1 from leads where id = p_lead_id for update;
  if not found then raise exception 'lead_not_found'; end if;
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

  v_next_status := case p_event_type
    when 'provider_replied', 'customer_replied' then 'provider_replied'
    when 'completed' then 'success'
    when 'cancelled' then 'cancelled'
    when 'expired' then 'no_response'
    else 'contacted'
  end;

  insert into lead_events (lead_id, event_type, actor_type, actor_profile_id, external_source, external_id, metadata)
  values (p_lead_id, p_event_type, p_actor_type, p_actor_profile_id, p_external_source, p_external_id, p_metadata)
  returning id into v_event_id;
  update leads set status = v_next_status,
    provider_contacted_at = case when p_event_type = 'provider_notified' then now() else provider_contacted_at end,
    provider_replied_at = case when p_event_type = 'provider_replied' then now() else provider_replied_at end,
    completed_at = case when p_event_type = 'completed' then now() else completed_at end,
    updated_at = now()
  where id = p_lead_id;
  return v_event_id;
end;
$$;

revoke all on function public.create_lead(uuid, uuid, uuid, uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_lead(uuid, uuid, uuid, uuid, text, text, text, text, jsonb) to service_role;
revoke all on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_lead_event(uuid, public.lead_event_type, public.lead_actor_type, uuid, text, text, jsonb) to service_role;
