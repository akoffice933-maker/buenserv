-- P1: support reply must be immutable, audited, and delivered through the durable
-- outbox (not a direct bot call after the RPC). This adds:
--   1. immutable trigger on support_request_messages
--   2. an audit event when an admin replies
--   3. an outbox task so the public bot delivers the reply reliably

-- 1. Immutability (mirrors lead_messages).
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

-- 2 & 3. Rework admin_reply_support_request to write an audit event and enqueue a
-- public-bot outbox delivery instead of returning a telegram id for a direct call.
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

  -- Reopen a closed request when an admin replies.
  update support_requests set status = 'reviewing', closed_at = null where id = p_request_id and status = 'closed';

  -- Audit event.
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'admin_replied_support', 'support_request', p_request_id,
          jsonb_build_object('message_id', v_message_id, 'profile_id', v_customer_profile_id));

  -- Durable delivery: enqueue a public-bot outbox task to the customer.
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

-- Allow the new notification type on the outbox.
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
