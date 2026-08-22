-- Manager subscription lifecycle / flat locking policy.
-- Active: normal access. Grace: existing app access, but invite generation is blocked.
-- Expired after grace: flat is read-only.

create or replace function private.flat_subscription_state(p_flat_id uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select private.subscription_state(f.owner_id) from public.flats f where f.id = p_flat_id;
$$;
revoke all on function private.flat_subscription_state(uuid) from public;
grant execute on function private.flat_subscription_state(uuid) to authenticated;

create or replace function private.assert_flat_writable(p_flat_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.flat_subscription_state(p_flat_id) = 'expired' then raise exception 'flat_locked_subscription_expired'; end if;
end;
$$;
revoke all on function private.assert_flat_writable(uuid) from public;
grant execute on function private.assert_flat_writable(uuid) to authenticated;

create or replace function private.prevent_locked_flat_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_flat uuid;
  v_cycle uuid;
  v_settlement uuid;
begin
  if v_row ? 'flat_id' then
    v_flat := nullif(v_row->>'flat_id','')::uuid;
  elsif v_row ? 'cycle_id' then
    v_cycle := nullif(v_row->>'cycle_id','')::uuid;
    select flat_id into v_flat from public.cycles where id = v_cycle;
  elsif v_row ? 'settlement_id' then
    v_settlement := nullif(v_row->>'settlement_id','')::uuid;
    select c.flat_id into v_flat from public.settlements s join public.cycles c on c.id = s.cycle_id where s.id = v_settlement;
  end if;
  if v_flat is not null and private.flat_subscription_state(v_flat) = 'expired' then
    raise exception 'flat_locked_subscription_expired';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function private.prevent_locked_flat_write() from public;
grant execute on function private.prevent_locked_flat_write() to authenticated;

drop trigger if exists expenses_block_locked_flat_write on public.expenses;
create trigger expenses_block_locked_flat_write before insert or update or delete on public.expenses for each row execute function private.prevent_locked_flat_write();
drop trigger if exists contributions_block_locked_flat_write on public.contributions;
create trigger contributions_block_locked_flat_write before insert or update or delete on public.contributions for each row execute function private.prevent_locked_flat_write();
drop trigger if exists meal_logs_block_locked_flat_write on public.meal_logs;
create trigger meal_logs_block_locked_flat_write before insert or update or delete on public.meal_logs for each row execute function private.prevent_locked_flat_write();
drop trigger if exists settlement_payments_block_locked_flat_write on public.settlement_payments;
create trigger settlement_payments_block_locked_flat_write before insert or update or delete on public.settlement_payments for each row execute function private.prevent_locked_flat_write();
drop trigger if exists cycle_closed_days_block_locked_flat_write on public.cycle_closed_days;
create trigger cycle_closed_days_block_locked_flat_write before insert or update or delete on public.cycle_closed_days for each row execute function private.prevent_locked_flat_write();
drop trigger if exists guest_meals_block_locked_flat_write on public.guest_meals;
create trigger guest_meals_block_locked_flat_write before insert or update or delete on public.guest_meals for each row execute function private.prevent_locked_flat_write();
drop trigger if exists member_leave_block_locked_flat_write on public.member_leave;
create trigger member_leave_block_locked_flat_write before insert or update or delete on public.member_leave for each row execute function private.prevent_locked_flat_write();

create or replace function public.generate_invite_code(p_flat_id uuid, p_ttl_days integer default 7)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_month_start date; v_count int; v_code text;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  if p_ttl_days < 1 or p_ttl_days > 30 then raise exception 'invalid_ttl'; end if;
  if not exists (select 1 from public.flats f where f.id = p_flat_id and f.owner_id = v_user) then raise exception 'forbidden'; end if;
  if private.subscription_state(v_user) <> 'active' then raise exception 'subscription_required'; end if;
  perform pg_advisory_xact_lock(hashtext('invite_limit_' || v_user::text));
  v_month_start := date_trunc('month', (now() at time zone 'Asia/Dhaka')::date)::date;
  select count(*) into v_count from public.invite_codes where created_by = v_user and created_month = v_month_start;
  if v_count >= 10 then raise exception 'monthly_invite_limit_reached'; end if;
  loop
    v_code := private.generate_invite_code();
    begin
      insert into public.invite_codes(flat_id, code, created_by, status, max_uses, used_count, expires_at) values (p_flat_id, v_code, v_user, 'active', 1, 0, now() + make_interval(days => p_ttl_days));
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata) values (p_flat_id, v_user, 'invite_code.generated', 'invite_code', p_flat_id, jsonb_build_object('code', v_code, 'expires_at', now() + make_interval(days => p_ttl_days)));
  return v_code;
end;
$$;
revoke all on function public.generate_invite_code(uuid, integer) from public;
grant execute on function public.generate_invite_code(uuid, integer) to authenticated;

create or replace function private.subscription_warning_state(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('state', private.subscription_state(p_user), 'period_end', s.current_period_end,
    'grace_days_remaining', case when s.current_period_end is not null and s.current_period_end <= now() and s.current_period_end > now() - interval '7 days' then greatest(0, 7 - floor(extract(epoch from (now() - s.current_period_end)) / 86400))::int else null end)
  from public.subscriptions s where s.user_id = p_user and s.plan = 'manager_monthly' order by s.updated_at desc limit 1;
$$;
revoke all on function private.subscription_warning_state(uuid) from public;
grant execute on function private.subscription_warning_state(uuid) to authenticated;
