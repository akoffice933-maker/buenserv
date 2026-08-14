-- P0-3: admin push notification channel. Adds bot_kind routing to the outbox so
-- operational alerts (new support request, new report, permanently failed outbox)
-- are delivered to the admin bot, not the public bot.

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

-- Enqueue an admin alert. The recipient is the first profile with role 'admin'.
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

-- Claim must return bot_kind so the delivery worker can route to the correct bot token.
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
revoke all on function public.enqueue_admin_alert(text, jsonb) from public, anon, authenticated;
grant execute on function public.enqueue_admin_alert(text, jsonb) to service_role;

-- When a public-bot outbox item becomes permanently failed, notify the admin bot.
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