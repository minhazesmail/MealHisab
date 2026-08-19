-- Final accounting/RLS refinements.

drop policy if exists cycle_closed_days_insert_manager on public.cycle_closed_days;
create policy cycle_closed_days_insert_manager on public.cycle_closed_days for insert to authenticated with check (
  exists (
    select 1 from public.cycles c
     where c.id = cycle_id
       and private.is_flat_manager(c.flat_id)
       and c.status = 'open'
       and date between c.start_date and c.end_date
  )
);

drop policy if exists cycle_closed_days_update_manager on public.cycle_closed_days;
create policy cycle_closed_days_update_manager on public.cycle_closed_days for update to authenticated using (
  exists (select 1 from public.cycles c where c.id=cycle_id and private.is_flat_manager(c.flat_id) and c.status='open')
) with check (
  exists (
    select 1 from public.cycles c
     where c.id = cycle_id
       and private.is_flat_manager(c.flat_id)
       and c.status = 'open'
       and date between c.start_date and c.end_date
  )
);

create or replace function public.close_cycle(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid:=auth.uid(); v_flat uuid; v_start date; v_end date; v_next_start date; v_next_end date; v_next uuid;
  v_total_cost numeric(14,2); v_total_meals bigint; v_rate numeric(14,2); v_residual numeric(14,2);
  v_adjust_user uuid;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select flat_id,start_date,end_date into v_flat,v_start,v_end from public.cycles where id=p_cycle_id for update;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if exists(select 1 from public.cycles where id=p_cycle_id and status='closed') then
    select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1 limit 1;
    if v_next is not null then return v_next; else raise exception 'cycle_already_closed'; end if;
  end if;

  select coalesce(sum(amount),0)::numeric(14,2) into v_total_cost from public.expenses where cycle_id=p_cycle_id;
  create temporary table if not exists tmp_settlement(user_id uuid primary key,meals integer not null,contribution numeric(12,2) not null,opening_balance numeric(14,2) not null,meal_cost numeric(14,2) not null default 0) on commit drop;
  truncate tmp_settlement;

  with member_days as (
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
  daily_meals as (
    select md.user_id,md.service_date,
      coalesce(max(ml.count) filter(where ml.meal_type='lunch'),case when md.meal_policy='opt_out' then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='dinner'),case when md.meal_policy='opt_out' then 1 else 0 end)
      + coalesce(max(ml.count) filter(where ml.meal_type='extra'),0) meals
      from member_days md
      left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=md.user_id and ml.date=md.service_date
     group by md.user_id,md.service_date,md.meal_policy
  ),
  meal_totals as (
    select user_id,sum(meals)::integer meals from daily_meals group by user_id
  ),
  contribution_totals as (
    select user_id,coalesce(sum(amount),0)::numeric(12,2) contribution from public.contributions where cycle_id=p_cycle_id group by user_id
  )
  insert into tmp_settlement(user_id,meals,contribution,opening_balance)
  select mt.user_id,mt.meals,coalesce(ct.contribution,0),coalesce(cm.opening_balance,0)
    from meal_totals mt
    join public.cycle_members cm on cm.cycle_id=p_cycle_id and cm.user_id=mt.user_id
    left join contribution_totals ct on ct.user_id=mt.user_id;

  select coalesce(sum(meals),0) into v_total_meals from tmp_settlement;
  if v_total_meals=0 and v_total_cost>0 then raise exception 'cannot_close_cycle_with_expenses_and_zero_meals'; end if;
  v_rate:=case when v_total_meals=0 then 0 else round(v_total_cost/v_total_meals,2) end;
  update tmp_settlement set meal_cost=round(meals*v_rate,2);
  select round(v_total_cost-coalesce(sum(meal_cost),0),2) into v_residual from tmp_settlement;
  select user_id into v_adjust_user from tmp_settlement order by meals desc,user_id desc limit 1;
  if v_residual<>0 and v_adjust_user is not null then
    update tmp_settlement set meal_cost=round(meal_cost+v_residual,2) where user_id=v_adjust_user;
  end if;

  insert into public.settlements(cycle_id,user_id,flat_id,total_meals,meal_cost,total_contribution,opening_balance,balance)
  select p_cycle_id,user_id,v_flat,meals,meal_cost,contribution,opening_balance,round(opening_balance+contribution-meal_cost,2)
    from tmp_settlement
  on conflict(cycle_id,user_id) do update set total_meals=excluded.total_meals,meal_cost=excluded.meal_cost,total_contribution=excluded.total_contribution,opening_balance=excluded.opening_balance,balance=excluded.balance;

  update public.cycles set status='closed' where id=p_cycle_id;
  v_next_start:=v_end+1; v_next_end:=(v_next_start+(v_end-v_start+1))-1;
  insert into public.cycles(flat_id,start_date,end_date,status) values(v_flat,v_next_start,v_next_end,'open') returning id into v_next;
  insert into public.cycle_members(cycle_id,user_id,active_from,opening_balance)
    select v_next,fm.user_id,greatest(v_next_start,fm.joined_at),coalesce(s.balance,0)
      from public.flat_members fm
      left join public.settlements s on s.cycle_id=p_cycle_id and s.user_id=fm.user_id
     where fm.flat_id=v_flat and fm.status='active';
  insert into public.audit_logs(flat_id,actor_id,action,entity_type,entity_id,metadata)
    values(v_flat,v_user,'cycle.closed','cycle',p_cycle_id,jsonb_build_object('next_cycle_id',v_next,'total_cost',v_total_cost,'total_meals',v_total_meals,'meal_rate',v_rate,'rounding_residual',v_residual));
  return v_next;
end;
$$;
revoke all on function public.close_cycle(uuid) from public;
grant execute on function public.close_cycle(uuid) to authenticated;
