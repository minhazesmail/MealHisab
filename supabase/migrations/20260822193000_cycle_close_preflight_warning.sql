-- Preflight warning for opt-out cycles where meals exist but grocery spend is missing or implausibly low.
-- Expenses currently do not have a service-date column, so this intentionally reports a
-- cycle-level warning instead of attributing grocery spend (or its absence) to a specific day.

create or replace function private.get_cycle_close_warnings(p_cycle_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_flat uuid;
  v_status text;
  v_meal_policy text;
  v_total_meals integer := 0;
  v_grocery_total numeric(14,2) := 0;
  v_warning boolean := false;
  v_sample_days jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;

  select c.flat_id, c.status, f.meal_policy
    into v_flat, v_status, v_meal_policy
    from public.cycles c
    join public.flats f on f.id = c.flat_id
   where c.id = p_cycle_id;

  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if v_status <> 'open' then
    return jsonb_build_object('warning', false, 'total_meals', 0, 'grocery_total', 0, 'sample_days', '[]'::jsonb);
  end if;

  with member_days as (
    select cm.user_id, gs.d::date as service_date
      from public.cycle_members cm
      join public.cycles c on c.id = cm.cycle_id
      cross join generate_series(c.start_date, least(c.end_date, current_date), interval '1 day') gs(d)
     where cm.cycle_id = p_cycle_id
       and gs.d::date >= cm.active_from
       and (cm.active_to is null or gs.d::date <= cm.active_to)
       and not exists (
         select 1 from public.cycle_closed_days cd
          where cd.cycle_id = p_cycle_id and cd.date = gs.d::date
       )
  ),
  daily_member_meals as (
    select md.service_date,
           md.user_id,
           coalesce(max(ml.count) filter (where ml.meal_type = 'lunch'), case when v_meal_policy = 'opt_out' then 1 else 0 end)
         + coalesce(max(ml.count) filter (where ml.meal_type = 'dinner'), case when v_meal_policy = 'opt_out' then 1 else 0 end)
         + coalesce(max(ml.count) filter (where ml.meal_type = 'extra'), 0) as meals
      from member_days md
      left join public.meal_logs ml
        on ml.cycle_id = p_cycle_id
       and ml.user_id = md.user_id
       and ml.date = md.service_date
     group by md.service_date, md.user_id
  ),
  daily_totals as (
    select service_date, sum(meals)::integer as meals
      from daily_member_meals
     group by service_date
  )
  select coalesce(sum(meals), 0)::integer into v_total_meals from daily_totals;

  select coalesce(sum(e.amount) filter (where e.category = 'grocery'), 0)::numeric(14,2)
    into v_grocery_total
    from public.expenses e
   where e.cycle_id = p_cycle_id;

  -- Opt-out cycles deserve a warning when meals were automatically accrued but there is
  -- no grocery spend at all. A very small positive total is also suspicious for a normal mess.
  v_warning := v_meal_policy = 'opt_out' and v_total_meals > 0 and v_grocery_total <= 5.00;

  select coalesce(jsonb_agg(
    jsonb_build_object('date', to_char(service_date, 'YYYY-MM-DD'), 'meals', meals)
    order by meals desc, service_date asc
  ), '[]'::jsonb)
    into v_sample_days
    from (
      select service_date, meals
        from daily_totals
       where meals > 0
       order by meals desc, service_date asc
       limit 5
    ) s;

  return jsonb_build_object(
    'warning', v_warning,
    'meal_policy', v_meal_policy,
    'total_meals', v_total_meals,
    'grocery_total', v_grocery_total,
    'sample_days', v_sample_days
  );
end;
$$;

create or replace function public.get_cycle_close_warnings(p_cycle_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.get_cycle_close_warnings(p_cycle_id);
$$;

revoke all on function public.get_cycle_close_warnings(uuid) from public;
grant execute on function public.get_cycle_close_warnings(uuid) to authenticated;
grant execute on function private.get_cycle_close_warnings(uuid) to authenticated;
