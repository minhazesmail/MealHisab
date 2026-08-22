-- Canonical Manager Plan activation logic.
-- One subscription row per user + plan. Payments extend active periods and
-- restart expired plans from now().

create unique index if not exists subscriptions_one_active_plan_per_user
on public.subscriptions(user_id, plan);

create or replace function private.activate_manager_subscription(p_user_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_subscription public.subscriptions;
begin
  if p_user_id is null then
    raise exception 'user_required';
  end if;

  insert into public.subscriptions(
    user_id,
    plan,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    updated_at
  )
  values (
    p_user_id,
    'manager_monthly',
    'active',
    v_now,
    v_now + interval '30 days',
    false,
    v_now
  )
  on conflict (user_id, plan)
  do update
  set
    status = 'active',
    current_period_start = case
      when public.subscriptions.current_period_end > v_now
        then public.subscriptions.current_period_start
      else v_now
    end,
    current_period_end = case
      when public.subscriptions.current_period_end > v_now
        then public.subscriptions.current_period_end + interval '30 days'
      else v_now + interval '30 days'
    end,
    cancel_at_period_end = false,
    updated_at = v_now
  returning * into v_subscription;

  return v_subscription;
end;
$$;

revoke all on function private.activate_manager_subscription(uuid) from public;
grant execute on function private.activate_manager_subscription(uuid) to authenticated;

-- Replace manual approval activation with the canonical helper.
create or replace function public.review_manager_payment_request(
  p_payment_request_id uuid,
  p_decision text,
  p_reject_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer uuid := auth.uid();
  v_payment public.payment_requests%rowtype;
  v_subscription public.subscriptions;
begin
  if v_reviewer is null then raise exception 'not_authenticated'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_review_decision'; end if;

  -- Only platform admins may approve or reject Manager Plan payments.
  if coalesce((select (raw_app_meta_data ->> 'role') from auth.users where id = v_reviewer), '') <> 'platform_admin' then
    raise exception 'forbidden';
  end if;

  select pr.* into v_payment
  from public.payment_requests pr
  where pr.id = p_payment_request_id
  for update;

  if v_payment.id is null then raise exception 'payment_request_not_found'; end if;
  if v_payment.status <> 'pending' then raise exception 'payment_request_already_reviewed'; end if;

  if p_decision = 'rejected' then
    update public.payment_requests
    set status = 'rejected',
        reviewed_by = v_reviewer,
        reviewed_at = now(),
        reject_reason = nullif(trim(p_reject_reason), ''),
        updated_at = now()
    where id = p_payment_request_id;
    return;
  end if;

  v_subscription := private.activate_manager_subscription(v_payment.user_id);

  update public.payment_requests
  set status = 'approved',
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      reject_reason = null,
      updated_at = now()
  where id = p_payment_request_id;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  select f.id, v_reviewer, 'manager_payment.approved', 'payment_request', v_payment.id,
         jsonb_build_object('user_id', v_payment.user_id, 'amount', v_payment.amount, 'currency', v_payment.currency, 'payment_method', v_payment.payment_method, 'period_end', v_subscription.current_period_end)
  from public.flats f
  where f.owner_id = v_payment.user_id
  order by f.created_at desc
  limit 1;
end;
$$;

revoke all on function public.review_manager_payment_request(uuid,text,text) from public;
grant execute on function public.review_manager_payment_request(uuid,text,text) to authenticated;
