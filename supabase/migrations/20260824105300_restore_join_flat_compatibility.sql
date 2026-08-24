-- Compatibility wrapper for an older server action that still calls join_flat.
-- The canonical implementation remains join_flat_with_code(), including its auth,
-- invite-state, subscription, membership, cycle-membership, and audit checks.
create or replace function public.join_flat(p_invite_code text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select public.join_flat_with_code(p_invite_code)
$$;

revoke execute on function public.join_flat(text) from public;
revoke execute on function public.join_flat(text) from anon;
grant execute on function public.join_flat(text) to authenticated;
grant execute on function public.join_flat(text) to service_role;
