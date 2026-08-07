-- Report moderation audit trail.
alter table public.reports add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists resolution_note text;

create or replace function public.resolve_report(
  p_report_id uuid,
  p_actor_profile_id uuid,
  p_status public.report_status,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('reviewing', 'resolved', 'dismissed') then raise exception 'Invalid report status'; end if;
  update reports set status = p_status, resolved_by = case when p_status in ('resolved', 'dismissed') then p_actor_profile_id else null end, resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end, resolution_note = p_note where id = p_report_id and status <> 'dismissed' and status <> 'resolved';
  if not found then raise exception 'Report not found or already closed'; end if;
  insert into audit_events (actor_profile_id, action, entity_type, entity_id, metadata)
  values (p_actor_profile_id, 'report_status_updated', 'report', p_report_id, jsonb_build_object('status', p_status, 'note', p_note));
end;
$$;
