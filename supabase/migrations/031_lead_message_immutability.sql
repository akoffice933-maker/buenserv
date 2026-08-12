-- Lead messages are conversation history, not editable business state.
-- Keep them immutable at the database level so service-role callers cannot
-- rewrite or delete conversation history accidentally.

create or replace function public.prevent_lead_message_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'lead_messages are immutable';
end;
$$;

drop trigger if exists lead_messages_immutable on public.lead_messages;
create trigger lead_messages_immutable
  before update or delete on public.lead_messages
  for each row execute function public.prevent_lead_message_mutation();
