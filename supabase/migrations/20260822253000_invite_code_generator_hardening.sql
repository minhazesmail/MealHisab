-- Harden invite-code generation: unambiguous codes, owner-only generation,
-- paid/grace manager access, Bangladesh-local monthly quota, and atomic quota locking.

create or replace function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_code text := '';
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  for i in 1..8 loop
    v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
  end loop;
  return v_code;
end;
$$;

revoke all on function private.generate_invite_code() from public;

drop function if exists public.generate_invite_code(uuid);
drop function if exists public.generate_invite_code(uuid, integer);

create or replace function public.generate_invite_code(
  p_flat_id uuid,
  p_ttl_days integer default 7
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_month_start date;
  v_count integer;
  v_code text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_ttl_days < 1 or p_ttl_days > 30 then
    raise exception 'invalid_ttl';
  end if;

  if not exists (
    select 1
    from public.flats
    where id = p_flat_id
      and owner_id = v_user
  ) then
    raise exception 'forbidden';
  end if;

  -- subscription_state returns active/grace/expired; trialing is folded into
  -- active by that helper while the subscription is within its paid period.
  if private.subscription_state(v_user) not in ('active', 'grace') then
    raise exception 'subscription_required';
  end if;

  perform pg_advisory_xact_lock(hashtext('invite_limit_' || v_user::text));

  v_month_start := date_trunc(
    'month',
    (now() at time zone 'Asia/Dhaka')::date
  )::date;

  select count(*)
    into v_count
    from public.invite_codes
   where created_by = v_user
     and created_month = v_month_start;

  if v_count >= 10 then
    raise exception 'monthly_invite_limit_reached';
  end if;

  loop
    v_code := private.generate_invite_code();
    begin
      insert into public.invite_codes(
        flat_id,
        code,
        created_by,
        status,
        max_uses,
        used_count,
        expires_at
      )
      values (
        p_flat_id,
        v_code,
        v_user,
        'active',
        1,
        0,
        now() + make_interval(days => p_ttl_days)
      );
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  insert into public.audit_logs(
    flat_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    p_flat_id,
    v_user,
    'invite_code.generated',
    'invite_code',
    p_flat_id,
    jsonb_build_object(
      'code', v_code,
      'ttl_days', p_ttl_days,
      'created_month', v_month_start
    )
  );

  return v_code;
end;
$$;

revoke all on function public.generate_invite_code(uuid, integer) from public;
grant execute on function public.generate_invite_code(uuid, integer) to authenticated;
