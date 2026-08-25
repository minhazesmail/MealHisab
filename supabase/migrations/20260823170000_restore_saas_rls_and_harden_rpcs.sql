-- Restore explicit RLS policies for client-visible SaaS tables after broad policy cleanup migrations.
alter table public.cycle_closed_days enable row level security;
alter table public.settlement_payments enable row level security;
alter table public.invite_codes enable row level security;
alter table public.payment_requests enable row level security;
alter table public.subscriptions enable row level security;
alter table public.flat_recovery_requests enable row level security;

drop policy if exists cycle_closed_days_select_member on public.cycle_closed_days;
create policy cycle_closed_days_select_member on public.cycle_closed_days for select to authenticated using (
  exists (select 1 from public.cycles c where c.id = cycle_closed_days.cycle_id and private.is_flat_member(c.flat_id))
);

drop policy if exists settlement_payments_select_member on public.settlement_payments;
drop policy if exists settlement_payments_select on public.settlement_payments;
create policy settlement_payments_select_member on public.settlement_payments for select to authenticated using (private.is_flat_member(flat_id));

drop policy if exists invite_codes_manager_select on public.invite_codes;
create policy invite_codes_manager_select on public.invite_codes for select to authenticated using (
  exists (select 1 from public.flats f where f.id = invite_codes.flat_id and f.owner_id = auth.uid())
);

drop policy if exists payment_requests_select_self on public.payment_requests;
drop policy if exists payment_requests_select on public.payment_requests;
create policy payment_requests_select_self on public.payment_requests for select to authenticated using (user_id = auth.uid());

drop policy if exists subscriptions_select_self on public.subscriptions;
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select_self on public.subscriptions for select to authenticated using (user_id = auth.uid());

drop policy if exists recovery_select_member on public.flat_recovery_requests;
create policy recovery_select_member on public.flat_recovery_requests for select to authenticated using (
  exists (select 1 from public.flat_members fm where fm.flat_id = flat_recovery_requests.flat_id and fm.user_id = auth.uid() and fm.status = 'active')
);

-- Client writes for these tables go through guarded SECURITY DEFINER RPCs.
revoke insert, update, delete on public.invite_codes from authenticated;
revoke insert, update, delete on public.payment_requests from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;

-- Anonymous callers must never be able to invoke application SECURITY DEFINER RPCs.
-- Historical branches did not always contain every RPC signature, so make ACL hardening
-- conditional on the function actually existing during a clean replay.
do $$
declare
  v_signature text;
  v_function regprocedure;
begin
  foreach v_signature in array array[
    'public.admin_cancel_subscription(uuid)',
    'public.admin_extend_subscription(uuid,integer)',
    'public.admin_override_invite_limit(uuid,integer)',
    'public.admin_unlock_flat(uuid,integer)',
    'public.review_manager_payment_request(uuid,text,text)',
    'public.archive_flat(uuid)',
    'public.cancel_manager_subscription()',
    'public.renew_manager_subscription()',
    'public.approve_guest_meal(uuid)',
    'public.cancel_guest_meal(uuid)',
    'public.approve_member_leave(uuid)',
    'public.cancel_member_leave(uuid)',
    'public.configure_cycle_mode(uuid,text,text,date,date,boolean)',
    'public.update_guest_meal_policy(uuid,text,integer,boolean)',
    'public.update_notification_preferences(boolean,text,time,boolean,time,time,text)',
    'public.manager_set_member_leave(uuid,uuid,date,date,text)',
    'public.request_flat_recovery(uuid,text,text)',
    'public.request_member_leave(uuid,date,date,text)',
    'public.record_guest_meal(uuid,date,text,integer,text)',
    'public.generate_invite_code(uuid,integer)',
    'public.revoke_invite_code(uuid)',
    'public.join_flat_with_code(text)',
    'public.leave_flat(uuid)',
    'public.create_manual_manager_payment(text,text,text,text)',
    'public.create_flat(text,text,integer,text)',
    'public.close_cycle(uuid)',
    'public.set_cycle_closed_day(uuid,date,text)',
    'public.remove_cycle_closed_day(uuid,date)',
    'public.ensure_notification_preferences()',
    'public.mark_notification_read(uuid)',
    'public.guest_meal_count(uuid,uuid)',
    'public.effective_meal_count(uuid,uuid)'
  ]
  loop
    v_function := to_regprocedure(v_signature);
    if v_function is not null then
      execute format('revoke execute on function %s from anon', v_function);
    end if;
  end loop;
end;
$$;

-- Cryptographically stronger invite code generation using pgcrypto bytes.
create or replace function private.generate_invite_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_raw bytea;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  i integer;
  v_pos integer;
begin
  v_raw := gen_random_bytes(8);
  for i in 0..7 loop
    v_pos := (get_byte(v_raw, i) % length(v_alphabet)) + 1;
    v_code := v_code || substr(v_alphabet, v_pos, 1);
  end loop;
  return v_code;
end;
$$;
revoke all on function private.generate_invite_code() from public;
