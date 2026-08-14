-- P0: notification_outbox.lead_id and lead_event_id were NOT NULL from migration 025,
-- but operational/admin/support notifications have no lead. Generalize the table so
-- lead-linked notifications keep requiring a lead, while operational notifications may
-- have NULL lead columns. A CHECK constraint enforces which kind each type belongs to.

alter table public.notification_outbox alter column lead_id drop not null;
alter table public.notification_outbox alter column lead_event_id drop not null;

alter table public.notification_outbox drop constraint if exists notification_outbox_notification_type_check;
alter table public.notification_outbox
  add constraint notification_outbox_notification_type_check
  check (
    (
      notification_type in (
        'provider_lead_notification',
        'customer_provider_reply',
        'provider_customer_reply',
        'customer_provider_completed',
        'provider_customer_confirmed'
      )
      and lead_id is not null
      and lead_event_id is not null
    )
    or
    (
      notification_type in (
        'admin_new_support_request',
        'admin_new_report',
        'admin_outbox_failed',
        'customer_support_reply'
      )
      and lead_id is null
      and lead_event_id is null
    )
  );
