-- Compatibility corrections for the manual Bangladesh payment-request model.

-- Normalize legacy gateway statuses before enforcing manual-review lifecycle.
update public.payment_requests
set status = case
  when status in ('paid','approved') then 'approved'
  when status in ('rejected','failed','cancelled','expired') then 'rejected'
  else 'pending'
end;

alter table public.payment_requests
  alter column transaction_id drop not null;

alter table public.payment_requests
  drop constraint if exists payment_requests_status_check;

alter table public.payment_requests
  add constraint payment_requests_status_check
  check (status in ('pending','approved','rejected'));

-- Reviewers may approve only payment requests belonging to their own flat's owner account.
create or replace function public.review_manager_payment_request(
  p_payment_request_id uuid,
  p_decision text,
  p_reject_reason text default null
)
returns void
language plpgsql
security definer
set search_path = '' as $$
declare
  v_reviewer uuid := auth.uid();
  v_payment public.payment_requests%rowtype;
  v_subscription uuid;
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_reviewer is null then raise exception 'not_authenticated'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_review_decision'; end if;

  select pr.* into v_payment
  from public.payment_requests pr
  join public.subscriptions sub on sub.id = pr.subscription_id
  join public.profiles target_user on target_user.id = pr.user_id
  where pr.id = p_payment_request_id
    and exists (
      select 1
      from public.flats f
      where f.owner_id = v_reviewer
        and f.owner_id = pr.user_id
    )
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

  select id into v_subscription
  from public.subscriptions
  where id = v_payment.subscription_id
  for update;

  if v_subscription is null then raise exception 'subscription_not_found'; end if;

  v_start := case
    when (select current_period_end from public.subscriptions where id=v_subscription) is not null
      and (select current_period_end from public.subscriptions where id=v_subscription) > now()
      then (select current_period_end from public.subscriptions where id=v_subscription)
    else now()
  end;
  v_end := v_start + interval '30 days';

  update public.payment_requests
  set status = 'approved',
      reviewed_by = v_reviewer,
      reviewed_at = now(),
      reject_reason = null,
      updated_at = now()
  where id = p_payment_request_id;

  update public.subscriptions
  set status = 'active',
      current_period_start = v_start,
      current_period_end = v_end,
      cancel_at_period_end = false,
      payment_provider = 'manual_bd',
      updated_at = now()
  where id = v_subscription;
end;
$$;

grant execute on function public.review_manager_payment_request(uuid,text,text) to authenticated;
