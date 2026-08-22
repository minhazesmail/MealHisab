-- Invite codes are private manager data.
alter table public.invite_codes enable row level security;

revoke all on public.invite_codes from public;
revoke select, insert, update, delete on public.invite_codes from authenticated;

-- Only the owner of a flat may read its invite codes directly.
drop policy if exists invite_codes_manager_select on public.invite_codes;
create policy invite_codes_manager_select
on public.invite_codes
for select
to authenticated
using (
  exists (
    select 1
    from public.flats f
    where f.id = invite_codes.flat_id
      and f.owner_id = (select auth.uid())
  )
);

-- No direct member writes. Generation, revocation, and consumption happen through
-- security-definer RPCs only.
drop policy if exists invite_codes_no_insert on public.invite_codes;
drop policy if exists invite_codes_no_update on public.invite_codes;
drop policy if exists invite_codes_no_delete on public.invite_codes;

-- Ensure the public join endpoint is the supported code-verification path.
revoke all on function public.join_flat_with_code(text) from public;
grant execute on function public.join_flat_with_code(text) to authenticated;
