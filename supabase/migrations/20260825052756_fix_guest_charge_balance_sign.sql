-- Guest charges are liabilities and must reduce the member's closing balance.
-- Replaces the current guest-aware cycle close function without rewriting migration history.

create or replace function private.close_cycle_internal(p_cycle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_flat uuid;
  v_status text;
  v_start date;
  v_end date;
  v_next_start date;
  v_next_end date;
  v_next uuid;
  v_total_cost numeric(14,2);
  v_total_meals bigint;
  v_rate numeric(14,2);
  v_residual numeric(14,2);
  v_guest_residual numeric(14,2);
  v_adjust_user uuid;
  v_pending_guest_meals boolean;
  v_guest_policy text;
  v_guest_free_limit integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select c.flat_id,c.status,c.start_date,c.end_date
    into v_flat,v_status,v_start,v_end
  from public.cycles c
  where c.id=p_cycle_id
  for update;

  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;

  if v_status<>'open' then
    select id into v_next
    from public.cycles
    where flat_id=v_flat and start_date=v_end+1
    limit 1;
    return v_next;
  end if;

  select f.guest_meal_policy,f.guest_free_limit
    into v_guest_policy,v_guest_free_limit
  from public.flats f
  where f.id=v_flat;

  select exists(
    select 1 from public.guest_meals gm
    where gm.cycle_id=p_cycle_id and gm.status='pending'
  ) into v_pending_guest_meals;

  if v_pending_guest_meals then
    raise exception 'cannot_close_cycle_with_pending_guest_meals';
  end if;

  select coalesce(sum(amount),0)::numeric(14,2)
    into v_total_cost
  from public.expenses
  where cycle_id=p_cycle_id;

  create temporary table if not exists tmp_settlement(
    user_id uuid primary key,
    meals integer not null,
    contribution numeric(12,2) not null,
    opening_balance numeric(14,2) not null,
    meal_cost numeric(14,2) not null default 0,
    guest_meals integer not null default 0,
    guest_charge numeric(14,2) not null default 0
  ) on commit drop;

  truncate tmp_settlement;

  with member_days as(
    select cm.user_id,gs.d::date service_date,f.meal_policy
    from public.cycle_members cm
    join public.cycles c on c.id=cm.cycle_id
    join public.flats f on f.id=c.flat_id
    cross join generate_series(c.start_date,c.end_date,interval '1 day') gs(d)
    where cm.cycle_id=p_cycle_id
      and gs.d::date>=cm.active_from
      and (cm.active_to is null or gs.d::date<=cm.active_to)
      and not exists(select 1 from public.cycle_closed_days cd where cd.cycle_id=p_cycle_id and cd.date=gs.d::date)
  ),
  daily_meals as(
    select md.user_id,
      coalesce(max(ml.count) filter(where ml.meal_type='lunch'),case when md.meal_policy='opt_out' and not exists(
        select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=md.user_id and l.status='approved' and md.service_date between l.start_date and l.end_date
      ) then 1 else 0 end)
      +coalesce(max(ml.count) filter(where ml.meal_type='dinner'),case when md.meal_policy='opt_out' and not exists(
        select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=md.user_id and l.status='approved' and md.service_date between l.start_date and l.end_date
      ) then 1 else 0 end)
      +coalesce(max(ml.count) filter(where ml.meal_type='extra'),0) meals
    from member_days md
    left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=md.user_id and ml.date=md.service_date
    group by md.user_id,md.service_date,md.meal_policy
  ),
  meal_totals as(select user_id,sum(meals)::integer meals from daily_meals group by user_id),
  contribution_totals as(select user_id,coalesce(sum(amount),0)::numeric(12,2) contribution from public.contributions where cycle_id=p_cycle_id group by user_id),
  guest_totals as(select host_user_id as user_id,coalesce(sum(guest_count),0)::integer guest_meals from public.guest_meals where cycle_id=p_cycle_id and status='approved' group by host_user_id)
  insert into tmp_settlement(user_id,meals,contribution,opening_balance,guest_meals)
  select mt.user_id,mt.meals,coalesce(ct.contribution,0),coalesce(cm.opening_balance,0),coalesce(gt.guest_meals,0)
  from meal_totals mt
  join public.cycle_members cm on cm.cycle_id=p_cycle_id and cm.user_id=mt.user_id
  left join contribution_totals ct on ct.user_id=mt.user_id
  left join guest_totals gt on gt.user_id=mt.user_id;

  select coalesce(sum(meals),0) into v_total_meals from tmp_settlement;
  if v_total_meals=0 and v_total_cost>0 then raise exception 'cannot_close_cycle_with_expenses_and_zero_meals'; end if;

  v_rate:=case when v_total_meals=0 then 0 else round(v_total_cost/v_total_meals,2) end;
  update tmp_settlement set meal_cost=round(meals*v_rate,2);

  select round(v_total_cost-coalesce(sum(meal_cost),0),2) into v_residual from tmp_settlement;
  select user_id into v_adjust_user from tmp_settlement order by meals desc,user_id desc limit 1;
  if v_residual<>0 and v_adjust_user is not null then
    update tmp_settlement set meal_cost=round(meal_cost+v_residual,2) where user_id=v_adjust_user;
  end if;

  if exists(select 1 from public.guest_meals where cycle_id=p_cycle_id and status='approved') then
    if v_rate=0 then raise exception 'cannot_close_cycle_with_guest_meals_and_zero_meal_rate'; end if;

    if v_guest_policy='host_pays' then
      update tmp_settlement set guest_charge=round(guest_meals*v_rate,2);

    elsif v_guest_policy='free_limit' then
      update tmp_settlement set guest_charge=round(greatest(guest_meals-coalesce(v_guest_free_limit,0),0)*v_rate,2);

    elsif v_guest_policy in ('shared_equal','shared_by_meals') then
      declare
        v_total_guest_meals integer := 0;
        v_total_guest_charge numeric(14,2) := 0;
        v_member_count integer := 0;
        v_weight_total numeric(14,2) := 0;
      begin
        select coalesce(sum(guest_count),0)::integer into v_total_guest_meals
        from public.guest_meals where cycle_id=p_cycle_id and status='approved';
        v_total_guest_charge:=round(v_total_guest_meals*v_rate,2);
        select count(*) into v_member_count from tmp_settlement;
        select coalesce(sum(meals),0)::numeric(14,2) into v_weight_total from tmp_settlement;
        if v_member_count=0 then raise exception 'cannot_allocate_guest_charges_without_members'; end if;

        if v_guest_policy='shared_equal' or v_weight_total=0 then
          update tmp_settlement set guest_charge=round(v_total_guest_charge/v_member_count,2);
        else
          update tmp_settlement set guest_charge=round(v_total_guest_charge*(meals::numeric/v_weight_total),2);
        end if;

        select round(v_total_guest_charge-coalesce(sum(guest_charge),0),2) into v_guest_residual from tmp_settlement;
        select user_id into v_adjust_user from tmp_settlement order by meals desc,user_id desc limit 1;
        if v_guest_residual<>0 and v_adjust_user is not null then
          update tmp_settlement set guest_charge=round(guest_charge+v_guest_residual,2) where user_id=v_adjust_user;
        end if;
      end;
    else
      raise exception 'invalid_guest_meal_policy';
    end if;
  end if;

  insert into public.settlements(cycle_id,flat_id,user_id,total_meals,meal_cost,total_contribution,opening_balance,balance,guest_meals,guest_charge)
  select p_cycle_id,v_flat,user_id,meals,meal_cost,contribution,opening_balance,round(opening_balance+contribution-meal_cost-guest_charge,2),guest_meals,guest_charge
  from tmp_settlement
  on conflict(cycle_id,user_id) do update set
    total_meals=excluded.total_meals,
    meal_cost=excluded.meal_cost,
    total_contribution=excluded.total_contribution,
    opening_balance=excluded.opening_balance,
    balance=excluded.balance,
    guest_meals=excluded.guest_meals,
    guest_charge=excluded.guest_charge;

  update public.cycle_members cm
  set closing_balance=s.balance
  from public.settlements s
  where s.cycle_id=p_cycle_id and s.user_id=cm.user_id and cm.cycle_id=p_cycle_id;

  update public.cycles set status='closed' where id=p_cycle_id;

  v_next_start:=v_end+1;
  v_next_end:=(v_next_start+(v_end-v_start+1))-1;
  select id into v_next from public.cycles where flat_id=v_flat and start_date=v_next_start limit 1;

  if v_next is null then
    insert into public.cycles(flat_id,start_date,end_date,status) values(v_flat,v_next_start,v_next_end,'open') returning id into v_next;
    insert into public.cycle_members(cycle_id,user_id,opening_balance,active_from)
    select v_next,fm.user_id,coalesce(s.balance,0),greatest(v_next_start,fm.joined_at::date)
    from public.flat_members fm
    left join public.settlements s on s.cycle_id=p_cycle_id and s.user_id=fm.user_id
    where fm.flat_id=v_flat and fm.status='active';
  end if;
  return v_next;
end;
$$;

revoke all on function public.close_cycle(uuid) from public;
grant execute on function public.close_cycle(uuid) to authenticated;
grant execute on function public.close_cycle(uuid) to service_role;
