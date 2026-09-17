revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.grant_admin_for_bootstrap_email() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;