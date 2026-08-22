-- Prevent members from leaving an open mess cycle while they still owe money.
-- The check is performed inside the security-definer RPC so direct API/RPC calls
-- cannot bypass the client-side workflow.

create or replace function private.current_open_cycle_member_balance(
  p_flat_id uuid,
  p_user_id uuid
)
returns numeric(14,2)
language sql
stable
security definer
set search_path = ''
as $$
  with current_cycle as (
    select c.id, c.start_date, c.end_date, f.meal_policy
      from public.cycles c
      join public.flats f on f.id = c.flat_id
     where c.flat_id = p_flat_id
       and c.status = 'open'
     order by c.start_date desc
     limit 1
  ),
  member as (
    select cm.cycle_id, cm.user_id, cm.active_from, cm.opening_balance
      from public.cycle_members cm
      join current_cycle c on c.id = cm.cycle_id
     where cm.user_id = p_user_id
  ),
  member_days as (
    select m.user_id,
           gs.d::date as service_date,
           c.meal_policy
      from member m
      join current_cycle c on c.id = m.cycle_id
      cross join generate_series(
        c.start_date,
        least(c.end_date, current_date),
        interval '1 day'
      ) gs(d)
     where gs.d::date >= m.active_from
       and not exists (
         select 1
           from public.cycle_closed_days cd
          where cd.cycle_id = c.id
            and cd.date = gs.d::date
       )
  ),
  member_meals as (
    select md.user_id,
           coalesce(sum(
             coalesce(max(ml.count) filter (where ml.meal_type = 'lunch'),
               case when md.meal_policy = 'opt_out' then 1 else 0 end)
             + coalesce(max(ml.count) filter (where ml.meal_type = 'dinner'),
               case when md.meal_policy = 'opt_out' then 1 else 0 end)
             + coalesce(max(ml.count) filter (where ml.meal_type = 'extra'), 0)
           ), 0)::numeric as meals
      from member_days md
      left join public.meal_logs ml
        on ml.cycle_id = (select id from current_cycle)
       and ml.user_id = md.user_id
       and ml.date = md.service_date
     group by md.user_id
  ),
  all_cycle_days as (
    select cm.user_id,
           gs.d::date as service_date,
           c.meal_policy
      from public.cycle_members cm
      join current_cycle c on c.id = cm.cycle_id
      cross join generate_series(
        c.start_date,
        least(c.end_date, current_date),
        interval '1 day'
      ) gs(d)
     where gs.d::date >= cm.active_from
       and not exists (
         select 1
           from public.cycle_closed_days cd
          where cd.cycle_id = c.id
            and cd.date = gs.d::date
       )
  ),
  all_meals as (
    select ad.user_id,
           coalesce(sum(
             coalesce(max(ml.count) filter (where ml.meal_type = 'lunch'),
               case when ad.meal_policy = 'opt_out' then 1 else 0 end)
             + coalesce(max(ml.count) filter (where ml.meal_type = 'dinner'),
               case when ad.meal_policy = 'opt_out' then 1 else 0 end)
             + coalesce(max(ml.count) filter (where ml.meal_type = 'extra'), 0)
           ), 0)::numeric as meals
      from all_cycle_days ad
      left join public.meal_logs ml
        on ml.cycle_id = (select id from current_cycle)
       and ml.user_id = ad.user_id
       and ml.date = ad.service_date
     group by ad.user_id
  ),
  totals as (
    select coalesce(sum(am.meals), 0) as total_meals,
           coalesce(sum(e.amount), 0)::numeric(14,2) as total_cost
      from all_meals am
      full join public.expenses e
        on e.cycle_id = (select id from current_cycle)
  ),
  user_totals as (
    select
      m.opening_balance,
      coalesce(m.opening_balance, 0)::numeric(14,2)
        + coalesce((
            select sum(cn.amount)
              from public.contributions cn
             where cn.cycle_id = (select id from current_cycle)
               and cn.user_id = p_user_id
          ), 0)::numeric(14,2)
        - case
            when totals.total_meals = 0 then 0
            else round(coalesce(mm.meals, 0) * totals.total_cost / totals.total_meals, 2)
          end as balance
      from member m
      left join member_meals mm on mm.user_id = m.user_id
      cross join totals
  )
  select round(balance, 2)
    from user_totals
    limit 1;
$$;

create or replace function public.leave_flat(p_flat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_balance numeric(14,2);
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select role
    into v_role
    from public.flat_members
   where flat_id = p_flat_id
     and user_id = v_user
     and status = 'active'
   for update;

  if v_role is null then
    raise exception 'not_active_member';
  end if;

  if v_role = 'admin' and not exists (
    select 1
      from public.flat_members
     where flat_id = p_flat_id
       and status = 'active'
       and role = 'admin'
       and user_id <> v_user
  ) then
    raise exception 'admin_must_transfer_admin_role_before_leaving';
  end if;

  v_balance := private.current_open_cycle_member_balance(p_flat_id, v_user);

  if coalesce(v_balance, 0) < -1.00 then
    raise exception 'member_has_outstanding_balance:%.2f', abs(v_balance)
      using errcode = 'P0001';
  end if;

  update public.flat_members
     set status = 'left', left_at = current_date
   where flat_id = p_flat_id
     and user_id = v_user;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    p_flat_id,
    v_user,
    'member.left',
    'flat_member',
    v_user,
    jsonb_build_object('final_open_cycle_balance', round(coalesce(v_balance, 0), 2))
  );
end;
$$;

revoke all on function public.leave_flat(uuid) from public;
grant execute on function public.leave_flat(uuid) to authenticated;
