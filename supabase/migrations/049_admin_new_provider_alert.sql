-- P0: notify the admin bot when a provider submits a profile for moderation.
-- The provider photo is stored as telegram_photo_file_id in onboarding_payload;
-- the admin alert carries the provider id so the admin panel can render the photo.

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
    'admin_new_provider',
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
  if p_notification_type not in ('admin_new_support_request', 'admin_new_report', 'admin_new_provider', 'admin_outbox_failed') then
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
