-- When an admin replies to a support request, open (or refresh) the customer's
-- support-reply session so the customer can answer back. Without this, the customer
-- receives the admin's message but cannot reply (no active session).

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

  -- Open/refresh the customer's reply session so they can answer back.
  insert into telegram_support_reply_sessions (profile_id, support_request_id, expires_at, updated_at)
  values (v_customer_profile_id, p_request_id, now() + interval '30 minutes', now())
  on conflict (profile_id) do update set
    support_request_id = excluded.support_request_id,
    expires_at = now() + interval '30 minutes',
    updated_at = now();

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
