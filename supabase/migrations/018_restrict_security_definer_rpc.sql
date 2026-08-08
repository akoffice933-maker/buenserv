-- Security-definer RPCs are invoked only from server-side service-role clients.
revoke all on function public.submit_provider(uuid, bigint, text, text, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.submit_provider(uuid, bigint, text, text, text, text, numeric, text) to service_role;

revoke all on function public.moderate_provider(uuid, uuid, public.provider_status, text) from public, anon, authenticated;
grant execute on function public.moderate_provider(uuid, uuid, public.provider_status, text) to service_role;

revoke all on function public.resolve_report(uuid, uuid, public.report_status, text) from public, anon, authenticated;
grant execute on function public.resolve_report(uuid, uuid, public.report_status, text) to service_role;

revoke all on function public.submit_public_report(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_public_report(text, uuid, text, text) to service_role;

revoke all on function public.submit_authenticated_report(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_authenticated_report(uuid, uuid, text, text) to service_role;

revoke all on function public.submit_support_request(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_support_request(uuid, text) to service_role;

revoke all on function public.resolve_support_request(uuid, uuid, public.support_request_status, text) from public, anon, authenticated;
grant execute on function public.resolve_support_request(uuid, uuid, public.support_request_status, text) to service_role;
