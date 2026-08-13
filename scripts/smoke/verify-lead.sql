-- Read-only verification for a single lead
-- Usage: psql "$PGCONN" --set=ON_ERROR_STOP=1 --set=lead_id='<uuid>' -f scripts/smoke/verify-lead.sql
-- IMPORTANT: do NOT commit or log your PGCONN. This script runs inside a read-only transaction and outputs only safe summary values.

begin transaction read only;

-- Lead existence check (safe summary)
select
  case when exists(
    select 1 from public.lead_messages where lead_id = :'lead_id'::uuid
  ) or exists(
    select 1 from public.lead_events where lead_id = :'lead_id'::uuid
  ) or exists(
    select 1 from public.notification_outbox where lead_id = :'lead_id'::uuid
  ) then 'yes' else 'no' end as lead_found;

-- Messages counts (do NOT reveal message bodies or other PII)
select
  (select count(*) from public.lead_messages where lead_id = :'lead_id'::uuid) as messages_count,
  (select count(*) from public.lead_messages where lead_id = :'lead_id'::uuid and sender_role = 'provider') as provider_messages,
  (select count(*) from public.lead_messages where lead_id = :'lead_id'::uuid and sender_role = 'customer') as customer_messages;

-- Are lead_event metadata objects free of inline message bodies? (expected: yes)
select
  case when exists(
    select 1 from public.lead_events where lead_id = :'lead_id'::uuid and (metadata ? 'message_body')
  ) then 'no' else 'yes' end as message_event_metadata_safe;

-- Outbox summary for expected notification types (show most recent status or 'missing')
select
  notification_type,
  coalesce(
    (select status from public.notification_outbox where lead_id = :'lead_id'::uuid and notification_type = t order by created_at desc limit 1),
    'missing'
  ) as latest_status
from (values ('provider_lead_notification'), ('customer_provider_reply'), ('provider_customer_reply')) as x(t);

-- Trigger presence (lead_messages immutability)
select
  case when exists(
    select 1 from pg_trigger where tgrelid = 'public.lead_messages'::regclass and not tgisinternal and tgname = 'lead_messages_immutable'
  ) then 'present' else 'missing' end as lead_messages_immutable_trigger;

-- Constraint presence and basic type checks (do not output full constraint text)
select
  case when exists(
    select 1 from pg_constraint where conrelid = 'public.notification_outbox'::regclass and conname = 'notification_outbox_notification_type_check'
  ) then 'present' else 'missing' end as notification_type_check_constraint_present,
  case when exists(
    select 1 from pg_constraint where conrelid = 'public.notification_outbox'::regclass and conname = 'notification_outbox_notification_type_check' and pg_get_constraintdef(oid) like '%provider_lead_notification%'
  ) then 'yes' else 'no' end as has_provider_lead_notification,
  case when exists(
    select 1 from pg_constraint where conrelid = 'public.notification_outbox'::regclass and conname = 'notification_outbox_notification_type_check' and pg_get_constraintdef(oid) like '%customer_provider_reply%'
  ) then 'yes' else 'no' end as has_customer_provider_reply,
  case when exists(
    select 1 from pg_constraint where conrelid = 'public.notification_outbox'::regclass and conname = 'notification_outbox_notification_type_check' and pg_get_constraintdef(oid) like '%provider_customer_reply%'
  ) then 'yes' else 'no' end as has_provider_customer_reply;

rollback;
