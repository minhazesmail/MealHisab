-- Canonical member join flow using the dedicated invite_codes ledger.
-- Keeps join_flat(text) as a compatibility wrapper while routing all joins through
-- the stronger join_flat_with_code(text) implementation.

create or replace function public.join_flat_with_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_invite record;
  v_owner uuid;
  v_flat uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_invite
    from public.invite_codes
   where code = upper(trim(p_code))
   for update;

  if not found then
    raise exception 'invalid_invite_code';
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'invite_code_revoked';
  end if;

  if v_invite.status = 'used' then
    raise exception 'invite_code_already_used';
  end if;

  if v_invite.expires_at < now() then
    update public.invite_codes
       set status = 'expired'
     where id = v_invite.id
       and status = 'active';
    raise exception 'invite_code_expired';
  end if;

  if v_invite.used_count >= v_invite.max_uses then
    update public.invite_codes
       set status = 'used'
     where id = v_invite.id
       and status = 'active';
    raise exception 'invite_code_already_used';
  end if;

  select f.owner_id
    into v_owner
    from public.flats f
   where f.id = v_invite.flat_id;

  if v_owner is null then
    raise exception 'invalid_invite_code';
  end if;

  if private.subscription_state(v_owner) = 'expired' then
    raise exception 'flat_locked_subscription_expired';
  end if;

  v_flat := v_invite.flat_id;

  -- Idempotent for an already-active member. The invite remains unconsumed in
  -- this branch because no new membership was created.
  if exists (
    select 1
      from public.flat_members fm
     where fm.flat_id = v_flat
       and fm.user_id = v_user
       and fm.status = 'active'
  ) then
    return v_flat;
  end if;

  insert into public.flat_members(flat_id, user_id, role, status)
  values(v_flat, v_user, 'member', 'active')
  on conflict (flat_id, user_id)
  do update
     set status = 'active',
         left_at = null,
         joined_at = current_date;

  -- Only the currently open cycle is affected; active_from prevents retroactive
  -- Opt-Out charges for dates before the member joined.
  insert into public.cycle_members(cycle_id, user_id, active_from, opening_balance)
  select c.id, v_user, greatest(c.start_date, current_date), 0
    from public.cycles c
   where c.flat_id = v_flat
     and c.status = 'open'
   order by c.start_date desc
   limit 1
  on conflict (cycle_id, user_id) do nothing;

  update public.invite_codes
     set used_count = used_count + 1,
         used_by = v_user,
         used_at = now(),
         status = case
           when used_count + 1 >= max_uses then 'used'
           else status
         end
   where id = v_invite.id;

  insert into public.audit_logs(
    flat_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values(
    v_flat,
    v_user,
    'member.joined',
    'flat_member',
    v_user,
    jsonb_build_object(
      'invite_code_id', v_invite.id,
      'code', v_invite.code
    )
  );

  return v_flat;
end;
$$;

revoke all on function public.join_flat_with_code(text) from public;
grant execute on function public.join_flat_with_code(text) to authenticated;

create or replace function public.join_flat(p_invite_code text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.join_flat_with_code(p_invite_code);
$$;

revoke all on function public.join_flat(text) from public;
grant execute on function public.join_flat(text) to authenticated;
