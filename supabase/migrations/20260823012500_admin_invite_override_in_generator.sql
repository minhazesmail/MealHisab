-- Apply platform-admin invite quota overrides to the canonical generator.
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
  v_count int;
  v_code text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_ttl_days < 1 or p_ttl_days > 30 then raise exception 'invalid_ttl'; end if;
  if not exists (select 1 from public.flats where id=p_flat_id and owner_id=v_user) then raise exception 'forbidden'; end if;
  if private.subscription_state(v_user) <> 'active' then raise exception 'subscription_required'; end if;

  perform pg_advisory_xact_lock(hashtext('invite_limit_' || v_user::text));
  v_month_start := date_trunc('month', (now() at time zone 'Asia/Dhaka')::date)::date;

  if not private.invite_limit_overridden(p_flat_id) then
    select count(*) into v_count from public.invite_codes where created_by=v_user and created_month=v_month_start;
    if v_count >= 10 then raise exception 'monthly_invite_limit_reached'; end if;
  end if;

  loop
    v_code := private.generate_invite_code();
    begin
      insert into public.invite_codes(flat_id, code, created_by, status, max_uses, used_count, expires_at)
      values(p_flat_id, v_code, v_user, 'active', 1, 0, now() + make_interval(days=>p_ttl_days));
      exit;
    exception when unique_violation then null;
    end;
  end loop;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values(p_flat_id, v_user, 'invite_code.generated', 'invite_code', p_flat_id,
         jsonb_build_object('code',v_code,'expires_at',now()+make_interval(days=>p_ttl_days),'quota_overridden',private.invite_limit_overridden(p_flat_id)));
  return v_code;
end;
$$;

grant execute on function public.generate_invite_code(uuid, integer) to authenticated;
