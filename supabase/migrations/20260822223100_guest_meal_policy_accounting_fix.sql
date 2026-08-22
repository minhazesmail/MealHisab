-- Correct guest allocation so guest meals participate in the same food-cost pool once.

create or replace function public.effective_meal_count(p_cycle_id uuid,p_user_id uuid)
returns integer language sql stable security definer set search_path = '' as $$
  with ctx as (
    select c.id cycle_id,c.start_date,c.end_date,f.meal_policy
    from public.cycles c join public.flats f on f.id=c.flat_id where c.id=p_cycle_id
  ), cm as (
    select cycle_id,user_id,active_from,active_to from public.cycle_members where cycle_id=p_cycle_id and user_id=p_user_id
  ), days as (
    select gs.d::date service_date,ctx.meal_policy
    from ctx join cm on cm.cycle_id=ctx.cycle_id
    cross join generate_series(ctx.start_date,ctx.end_date,interval '1 day') gs(d)
    where gs.d::date>=cm.active_from and (cm.active_to is null or gs.d::date<=cm.active_to)
      and not exists(select 1 from public.cycle_closed_days cd where cd.cycle_id=p_cycle_id and cd.date=gs.d::date)
  ), daily as (
    select d.service_date,
      coalesce(max(ml.count) filter(where ml.meal_type='lunch'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
      +coalesce(max(ml.count) filter(where ml.meal_type='dinner'),case when d.meal_policy='opt_out' and not exists(select 1 from public.member_leave l where l.cycle_id=p_cycle_id and l.user_id=p_user_id and l.status='approved' and d.service_date between l.start_date and l.end_date) then 1 else 0 end)
      +coalesce(max(ml.count) filter(where ml.meal_type='extra'),0) meals
    from days d left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=p_user_id and ml.date=d.service_date
    group by d.service_date,d.meal_policy
  ) select coalesce(sum(meals),0)::integer from daily;
$$;

create or replace function public.guest_charge_for_user(p_cycle_id uuid,p_user_id uuid)
returns numeric(14,2) language sql stable security definer set search_path = '' as $$
  with ctx as (
    select f.guest_meal_policy,f.guest_free_limit,
      (select coalesce(sum(e.amount),0)::numeric from public.expenses e where e.cycle_id=p_cycle_id) total_cost,
      (select coalesce(sum(public.effective_meal_count(p_cycle_id,cm.user_id)),0)::numeric from public.cycle_members cm where cm.cycle_id=p_cycle_id) member_meals,
      (select count(*)::numeric from public.cycle_members cm where cm.cycle_id=p_cycle_id) member_count,
      public.guest_meal_count(p_cycle_id,p_user_id)::numeric user_guests,
      public.guest_meal_count(p_cycle_id,null)::numeric total_guests
    from public.cycles c join public.flats f on f.id=c.flat_id where c.id=p_cycle_id
  ), rate as (select case when member_meals+total_guests=0 then 0 else total_cost/(member_meals+total_guests) end r from ctx)
  select round(case
    when ctx.guest_meal_policy='host_pays' then ctx.user_guests*rate.r
    when ctx.guest_meal_policy='shared_equal' then (ctx.total_guests*rate.r)/nullif(ctx.member_count,0)
    when ctx.guest_meal_policy='shared_by_meals' then (ctx.total_guests*rate.r)*(public.effective_meal_count(p_cycle_id,p_user_id)/nullif(ctx.member_meals,0))
    when ctx.guest_meal_policy='free_limit' then
      greatest(ctx.user_guests-ctx.guest_free_limit,0)*rate.r
      + (select coalesce(sum(least(public.guest_meal_count(p_cycle_id,cm.user_id),ctx.guest_free_limit)),0) from public.cycle_members cm)*rate.r/nullif(ctx.member_count,0)
    else 0 end,2)::numeric(14,2)
  from ctx,rate;
$$;

create or replace function private.close_cycle_internal(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid:=auth.uid(); v_flat uuid; v_status text; v_start date; v_end date; v_food numeric(14,2); v_rate numeric(14,6); v_member_meals bigint; v_guest_meals bigint; v_next uuid; v_len integer; v_residual numeric(14,2); v_next_balance numeric(14,2); r record;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select c.flat_id,c.status,c.start_date,c.end_date,c.end_date-c.start_date+1 into v_flat,v_status,v_start,v_end,v_len from public.cycles c where c.id=p_cycle_id for update;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if v_status<>'open' then select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1; return v_next; end if;
  select coalesce(sum(amount),0)::numeric(14,2) into v_food from public.expenses where cycle_id=p_cycle_id;
  select coalesce(sum(public.effective_meal_count(p_cycle_id,cm.user_id)),0) into v_member_meals from public.cycle_members cm where cm.cycle_id=p_cycle_id;
  v_guest_meals:=public.guest_meal_count(p_cycle_id,null);
  if v_member_meals+v_guest_meals=0 and v_food>0 then raise exception 'cannot_close_cycle_with_expenses_and_zero_meals'; end if;
  v_rate:=case when v_member_meals+v_guest_meals=0 then 0 else round(v_food/(v_member_meals+v_guest_meals),6) end;

  create temporary table if not exists tmp_guest_settlement(user_id uuid primary key,meals integer not null,contribution numeric(12,2) not null,opening_balance numeric(14,2) not null,meal_cost numeric(14,2) not null default 0,guest_charge numeric(14,2) not null default 0,guest_meals integer not null default 0) on commit drop;
  truncate tmp_guest_settlement;
  insert into tmp_guest_settlement(user_id,meals,contribution,opening_balance,meal_cost,guest_charge,guest_meals)
  select cm.user_id,public.effective_meal_count(p_cycle_id,cm.user_id),coalesce((select sum(c.amount) from public.contributions c where c.cycle_id=p_cycle_id and c.user_id=cm.user_id),0)::numeric(12,2),cm.opening_balance,round(public.effective_meal_count(p_cycle_id,cm.user_id)*v_rate,2),public.guest_charge_for_user(p_cycle_id,cm.user_id),public.guest_meal_count(p_cycle_id,cm.user_id)
  from public.cycle_members cm where cm.cycle_id=p_cycle_id;

  select round(v_food-coalesce(sum(meal_cost+guest_charge),0),2) into v_residual from tmp_guest_settlement;
  if v_residual<>0 then
    update tmp_guest_settlement set guest_charge=round(guest_charge+v_residual,2) where user_id=(select user_id from tmp_guest_settlement order by meals desc,user_id desc limit 1);
  end if;

  for r in select * from tmp_guest_settlement loop
    insert into public.settlements(cycle_id,flat_id,user_id,total_meals,meal_cost,total_contribution,opening_balance,balance,guest_meals,guest_charge)
    values(p_cycle_id,v_flat,r.user_id,r.meals,r.meal_cost,r.contribution,r.opening_balance,round(r.opening_balance+r.contribution-r.meal_cost-r.guest_charge,2),r.guest_meals,r.guest_charge)
    on conflict(cycle_id,user_id) do update set total_meals=excluded.total_meals,meal_cost=excluded.meal_cost,total_contribution=excluded.total_contribution,opening_balance=excluded.opening_balance,balance=excluded.balance,guest_meals=excluded.guest_meals,guest_charge=excluded.guest_charge;
  end loop;

  update public.cycles set status='closed' where id=p_cycle_id;
  insert into public.cycles(flat_id,start_date,end_date,status) values(v_flat,v_end+1,v_end+v_len,'open') returning id into v_next;
  insert into public.cycle_members(cycle_id,user_id,opening_balance,active_from)
    select v_next,s.user_id,s.balance,v_end+1 from public.settlements s where s.cycle_id=p_cycle_id;
  return v_next;
end;
$$;
