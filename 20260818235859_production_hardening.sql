create schema if not exists private;

create or replace function private.is_flat_member(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from public.flat_members fm where fm.flat_id = p_flat_id and fm.user_id = (select auth.uid()) and fm.status = 'active');
$fn$;

create or replace function private.is_flat_manager(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from public.flat_members fm where fm.flat_id = p_flat_id and fm.user_id = (select auth.uid()) and fm.status = 'active' and fm.role in ('admin','manager'));
$fn$;

create or replace function private.is_flat_manager_or_admin(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select private.is_flat_manager(p_flat_id);
$fn$;

create or replace function private.is_flat_admin(p_flat_id uuid)
returns boolean language sql stable security definer set search_path = '' as $fn$
  select exists (select 1 from public.flat_members fm where fm.flat_id = p_flat_id and fm.user_id = (select auth.uid()) and fm.status = 'active' and fm.role = 'admin');
$fn$;

grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

do $drop$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname in ('public','storage') loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end
$drop$;

drop function if exists public.is_flat_member(uuid) cascade;
drop function if exists public.is_flat_manager_or_admin(uuid) cascade;
drop function if exists public.is_flat_admin(uuid) cascade;

create policy profiles_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy flats_member_select on public.flats for select to authenticated using (private.is_flat_member(id));
create policy flats_creator_insert on public.flats for insert to authenticated with check (created_by = (select auth.uid()));
create policy flats_admin_update on public.flats for update to authenticated using (private.is_flat_admin(id)) with check (private.is_flat_admin(id));
create policy flats_admin_delete on public.flats for delete to authenticated using (private.is_flat_admin(id));
create policy flat_members_select on public.flat_members for select to authenticated using (private.is_flat_member(flat_id));
create policy flat_members_admin_insert on public.flat_members for insert to authenticated with check (private.is_flat_admin(flat_id));
create policy flat_members_admin_update on public.flat_members for update to authenticated using (private.is_flat_admin(flat_id)) with check (private.is_flat_admin(flat_id));
create policy flat_members_admin_delete on public.flat_members for delete to authenticated using (private.is_flat_admin(flat_id));
create policy cycles_member_select on public.cycles for select to authenticated using (private.is_flat_member(flat_id));
create policy cycles_manager_insert on public.cycles for insert to authenticated with check (private.is_flat_manager(flat_id));
create policy cycles_manager_update on public.cycles for update to authenticated using (private.is_flat_manager(flat_id)) with check (private.is_flat_manager(flat_id));
create policy cycle_members_select on public.cycle_members for select to authenticated using (exists (select 1 from public.cycles c where c.id = cycle_members.cycle_id and private.is_flat_member(c.flat_id)));
create policy meal_logs_select on public.meal_logs for select to authenticated using (private.is_flat_member(flat_id));
create policy meal_logs_insert on public.meal_logs for insert to authenticated with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = meal_logs.cycle_id and c.flat_id = meal_logs.flat_id and c.status = 'open'));
-- Updates to meal_logs/expenses/contributions must not be allowed once the cycle is closed,
-- otherwise historical data backing an already-generated settlement can be silently altered.
create policy meal_logs_update on public.meal_logs for update to authenticated using (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = meal_logs.cycle_id and c.flat_id = meal_logs.flat_id and c.status = 'open')) with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = meal_logs.cycle_id and c.flat_id = meal_logs.flat_id and c.status = 'open'));
create policy meal_logs_delete on public.meal_logs for delete to authenticated using (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = meal_logs.cycle_id and c.flat_id = meal_logs.flat_id and c.status = 'open'));
create policy expenses_select on public.expenses for select to authenticated using (private.is_flat_member(flat_id));
create policy expenses_insert on public.expenses for insert to authenticated with check (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = expenses.cycle_id and c.flat_id = expenses.flat_id and c.status = 'open'));
create policy expenses_update on public.expenses for update to authenticated using (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = expenses.cycle_id and c.flat_id = expenses.flat_id and c.status = 'open')) with check (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = expenses.cycle_id and c.flat_id = expenses.flat_id and c.status = 'open'));
create policy expenses_delete on public.expenses for delete to authenticated using (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = expenses.cycle_id and c.flat_id = expenses.flat_id and c.status = 'open'));
create policy contributions_select on public.contributions for select to authenticated using (private.is_flat_member(flat_id));
create policy contributions_insert on public.contributions for insert to authenticated with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = contributions.cycle_id and c.flat_id = contributions.flat_id and c.status = 'open'));
create policy contributions_update on public.contributions for update to authenticated using (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = contributions.cycle_id and c.flat_id = contributions.flat_id and c.status = 'open')) with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = contributions.cycle_id and c.flat_id = contributions.flat_id and c.status = 'open'));
create policy contributions_delete on public.contributions for delete to authenticated using (private.is_flat_manager(flat_id));
-- Former members must keep read access to their own settlement/payment history after leaving (see 00007).
create policy settlements_select on public.settlements for select to authenticated using (user_id = (select auth.uid()) or private.is_flat_member(flat_id));
create policy settlement_payments_select on public.settlement_payments for select to authenticated using (user_id = (select auth.uid()) or private.is_flat_member(flat_id));
-- settlement_payments has no insert/update/delete policy on purpose: rows are immutable and can
-- only be written via the record_settlement_payment() SECURITY DEFINER RPC (see 00006).
create policy cycle_closed_days_select on public.cycle_closed_days for select to authenticated using (exists (select 1 from public.cycles c where c.id = cycle_closed_days.cycle_id and private.is_flat_member(c.flat_id)));
create policy cycle_closed_days_insert on public.cycle_closed_days for insert to authenticated with check (exists (select 1 from public.cycles c where c.id = cycle_closed_days.cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open' and cycle_closed_days.date between c.start_date and c.end_date));
create policy cycle_closed_days_update on public.cycle_closed_days for update to authenticated using (exists (select 1 from public.cycles c where c.id = cycle_closed_days.cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open')) with check (exists (select 1 from public.cycles c where c.id = cycle_closed_days.cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open' and cycle_closed_days.date between c.start_date and c.end_date));
create policy cycle_closed_days_delete on public.cycle_closed_days for delete to authenticated using (exists (select 1 from public.cycles c where c.id = cycle_closed_days.cycle_id and private.is_flat_manager(c.flat_id) and c.status = 'open'));
create policy notifications_select on public.notifications for select to authenticated using (user_id = (select auth.uid()) and private.is_flat_member(flat_id));
create policy notifications_update on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy audit_logs_admin_select on public.audit_logs for select to authenticated using (private.is_flat_admin(flat_id));
create policy avatars_self_all on storage.objects for all to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_member_select on storage.objects for select to authenticated using (bucket_id = 'receipts' and private.is_flat_member(((storage.foldername(name))[1])::uuid));
create policy receipts_manager_insert on storage.objects for insert to authenticated with check (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid));
create policy receipts_manager_update on storage.objects for update to authenticated using (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid)) with check (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid));
create policy receipts_manager_delete on storage.objects for delete to authenticated using (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid));

-- cycle_members.closing_balance is a denormalized convenience copy of the settlement balance,
-- written by close_cycle_internal below.
alter table public.cycle_members add column if not exists closing_balance numeric(14,2);

create or replace function private.close_cycle_internal(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare
  v_uid uuid := (select auth.uid()); v_flat uuid; v_status text; v_start date; v_end date; v_len integer;
  v_total_cost numeric(14,2); v_total_meals bigint; v_rate numeric(14,2); v_residual numeric(14,2); v_adjust_user uuid;
  v_next_start date; v_next_end date; v_next uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select c.flat_id,c.status,c.start_date,c.end_date,c.end_date-c.start_date+1 into v_flat,v_status,v_start,v_end,v_len
    from public.cycles c where c.id=p_cycle_id for update;
  if v_flat is null then raise exception 'cycle_not_found'; end if;
  if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
  if v_status <> 'open' then
    select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1;
    if v_next is not null then return v_next; else raise exception 'cycle_already_closed'; end if;
  end if;

  -- All expense categories (grocery, cook salary, gas, other) feed the settlement cost.
  select coalesce(sum(amount),0)::numeric(14,2) into v_total_cost from public.expenses where cycle_id=p_cycle_id;

  create temporary table if not exists tmp_settlement(
    user_id uuid primary key, meals integer not null, contribution numeric(12,2) not null,
    opening_balance numeric(14,2) not null, meal_cost numeric(14,2) not null default 0
  ) on commit drop;
  truncate tmp_settlement;

  with member_days as (
    select cm.user_id, gs.d::date as service_date, f.meal_policy
      from public.cycle_members cm
      join public.cycles c on c.id = cm.cycle_id
      join public.flats f on f.id = c.flat_id
      cross join generate_series(c.start_date, c.end_date, interval '1 day') gs(d)
     where cm.cycle_id = p_cycle_id
       and gs.d::date >= cm.active_from
       and (cm.active_to is null or gs.d::date <= cm.active_to)
       and not exists (select 1 from public.cycle_closed_days cd where cd.cycle_id = p_cycle_id and cd.date = gs.d::date)
  ),
  daily_meals as (
    select md.user_id, md.service_date,
      coalesce(max(ml.count) filter (where ml.meal_type='lunch'), case when md.meal_policy='opt_out' then 1 else 0 end)
      + coalesce(max(ml.count) filter (where ml.meal_type='dinner'), case when md.meal_policy='opt_out' then 1 else 0 end)
      + coalesce(max(ml.count) filter (where ml.meal_type='extra'), 0) as meals
      from member_days md
      left join public.meal_logs ml on ml.cycle_id=p_cycle_id and ml.user_id=md.user_id and ml.date=md.service_date
     group by md.user_id, md.service_date, md.meal_policy
  ),
  meal_totals as (
    select user_id, sum(meals)::integer as meals from daily_meals group by user_id
  ),
  contribution_totals as (
    select user_id, coalesce(sum(amount),0)::numeric(12,2) as contribution from public.contributions where cycle_id=p_cycle_id group by user_id
  )
  insert into tmp_settlement(user_id, meals, contribution, opening_balance)
  select mt.user_id, mt.meals, coalesce(ct.contribution,0), coalesce(cm.opening_balance,0)
    from meal_totals mt
    join public.cycle_members cm on cm.cycle_id=p_cycle_id and cm.user_id=mt.user_id
    left join contribution_totals ct on ct.user_id=mt.user_id;

  select coalesce(sum(meals),0) into v_total_meals from tmp_settlement;
  if v_total_meals = 0 and v_total_cost > 0 then raise exception 'cannot_close_cycle_with_expenses_and_zero_meals'; end if;
  v_rate := case when v_total_meals = 0 then 0 else round(v_total_cost / v_total_meals, 2) end;
  update tmp_settlement set meal_cost = round(meals * v_rate, 2);

  -- Reconcile rounding drift so the ledger balances exactly, charging the member with the most meals.
  select round(v_total_cost - coalesce(sum(meal_cost),0), 2) into v_residual from tmp_settlement;
  select user_id into v_adjust_user from tmp_settlement order by meals desc, user_id desc limit 1;
  if v_residual <> 0 and v_adjust_user is not null then
    update tmp_settlement set meal_cost = round(meal_cost + v_residual, 2) where user_id = v_adjust_user;
  end if;

  insert into public.settlements(cycle_id, user_id, flat_id, total_meals, meal_cost, total_contribution, opening_balance, balance)
  select p_cycle_id, user_id, v_flat, meals, meal_cost, contribution, opening_balance, round(opening_balance + contribution - meal_cost, 2)
    from tmp_settlement
  on conflict (cycle_id, user_id) do update set
    total_meals = excluded.total_meals, meal_cost = excluded.meal_cost, total_contribution = excluded.total_contribution,
    opening_balance = excluded.opening_balance, balance = excluded.balance;

  update public.cycle_members cm set closing_balance = s.balance
    from public.settlements s where s.cycle_id = p_cycle_id and s.user_id = cm.user_id and cm.cycle_id = p_cycle_id;

  update public.cycles set status='closed' where id=p_cycle_id;
  v_next_start := v_end + 1; v_next_end := (v_next_start + v_len) - 1;
  select id into v_next from public.cycles where flat_id=v_flat and start_date=v_next_start;
  if v_next is null then
    insert into public.cycles(flat_id, start_date, end_date, status) values (v_flat, v_next_start, v_next_end, 'open') returning id into v_next;
    insert into public.cycle_members(cycle_id, user_id, active_from, opening_balance)
      select v_next, fm.user_id, greatest(v_next_start, fm.joined_at), coalesce(s.balance,0)
        from public.flat_members fm
        left join public.settlements s on s.cycle_id=p_cycle_id and s.user_id=fm.user_id
       where fm.flat_id=v_flat and fm.status='active';
  end if;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_flat, v_uid, 'cycle.closed', 'cycle', p_cycle_id, jsonb_build_object(
      'next_cycle_id', v_next, 'total_cost', v_total_cost, 'total_meals', v_total_meals,
      'meal_rate', v_rate, 'rounding_residual', v_residual
    ));
  return v_next;
end;
$fn$;
revoke all on function private.close_cycle_internal(uuid) from public;
grant execute on function private.close_cycle_internal(uuid) to authenticated;

drop function if exists public.close_cycle(uuid);
create function public.close_cycle(p_cycle_id uuid)
returns uuid language sql security invoker set search_path = '' as $fn$
  select private.close_cycle_internal(p_cycle_id)
$fn$;
revoke all on function public.close_cycle(uuid) from public;
grant execute on function public.close_cycle(uuid) to authenticated;

create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists contributions_created_by_idx on public.contributions(created_by);
create index if not exists contributions_flat_id_idx on public.contributions(flat_id);
create index if not exists contributions_user_id_idx on public.contributions(user_id);
create index if not exists cycle_members_user_id_idx on public.cycle_members(user_id);
create index if not exists expenses_created_by_idx on public.expenses(created_by);
create index if not exists expenses_flat_id_idx on public.expenses(flat_id);
create index if not exists flats_created_by_idx on public.flats(created_by);
create index if not exists meal_logs_created_by_idx on public.meal_logs(created_by);
create index if not exists meal_logs_user_id_idx on public.meal_logs(user_id);
create index if not exists notifications_flat_id_idx on public.notifications(flat_id);
create index if not exists settlements_flat_id_idx on public.settlements(flat_id);
create index if not exists settlements_user_id_idx on public.settlements(user_id);

drop index if exists public.flat_members_user_flat_idx;
drop index if exists public.meal_logs_cycle_user_date_idx;
drop index if exists public.expenses_cycle_idx;
drop index if exists public.contributions_cycle_user_idx;
drop index if exists public.cycle_members_cycle_idx;
drop index if exists public.notifications_user_read_idx;
drop index if exists public.audit_logs_flat_created_idx;
