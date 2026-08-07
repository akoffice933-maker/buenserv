-- Internal support request handling.
alter table public.support_requests add column if not exists handled_by uuid references public.profiles(id) on delete set null;
alter table public.support_requests add column if not exists resolution_note text;

create or replace function public.resolve_support_request(
  p_request_id uuid,
  p_actor_profile_id uuid,
  p_status public.support_request_status,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('reviewing', 'closed') then raise exception 'Invalid support status'; end if;
  update support_requests set status = p_status, handled_by = case when p_status = 'closed' then p_actor_profile_id else null end, closed_at = case when p_status = 'closed' then now() else null end, resolution_note = p_note where id = p_request_id and status <> 'closed';
  if not found then raise exception 'Support request not found or already closed'; end if;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'support_status_updated', 'support_request', p_request_id, jsonb_build_object('status', p_status, 'note', p_note));
end;
$$;
