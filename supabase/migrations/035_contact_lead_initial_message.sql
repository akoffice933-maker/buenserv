-- P0-1: persist the customer's request description as an initial lead message.
-- A single atomic RPC creates the lead, stores the customer's request text as the
-- first message in the thread, advances the lifecycle (customer_contacted,
-- provider_notified) and enqueues the provider outbox task — all in one transaction.
-- The description is NOT hidden in event metadata; it is a real, visible message.

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
  v_recipient_profile_id uuid;
  v_body text := btrim(coalesce(p_description, ''));
begin
  if p_external_source is null or p_external_id is null then raise exception 'external_idempotency_required'; end if;
  if char_length(v_body) > 2000 then raise exception 'message_body_too_long'; end if;

  -- Idempotency: return the existing lead if this external id was already processed.
  select id into v_lead_id from leads where external_source = p_external_source and external_id = p_external_id;
  if v_lead_id is not null then return v_lead_id; end if;

  if not exists (select 1 from providers where id = p_provider_id and status = 'approved') then raise exception 'provider_not_found'; end if;

  -- 1. Create the lead.
  insert into leads (customer_profile_id, provider_id, category_id, barrio_id, source, source_detail, external_source, external_id, status, telegram_started_at)
  values (p_customer_profile_id, p_provider_id, p_category_id, p_barrio_id, 'mini_app', 'customer_contact', p_external_source, p_external_id, 'created', now())
  returning id into v_lead_id;

  -- 2. customer_contacted event (status -> contacted).
  v_event_id := public.record_lead_event(
    v_lead_id, 'customer_contacted', 'customer', p_customer_profile_id,
    p_external_source, p_external_id || ':customer_contacted', coalesce(p_metadata, '{}'::jsonb)
  );

  -- 3. Persist the customer's request as the initial message in the thread.
  if char_length(v_body) > 0 then
    insert into lead_messages (lead_id, sender_profile_id, sender_role, body, external_source, external_id, lead_event_id, metadata)
    values (v_lead_id, p_customer_profile_id, 'customer', v_body, p_external_source, p_external_id || ':initial_message', v_event_id, coalesce(p_metadata, '{}'::jsonb))
    returning id into v_message_id;
  end if;

  -- 4. provider_notified event -> creates the provider outbox task automatically.
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
