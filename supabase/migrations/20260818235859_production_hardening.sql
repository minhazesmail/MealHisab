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
create policy meal_logs_update on public.meal_logs for update to authenticated using (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))) with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)));
create policy meal_logs_delete on public.meal_logs for delete to authenticated using (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = meal_logs.cycle_id and c.flat_id = meal_logs.flat_id and c.status = 'open'));
create policy expenses_select on public.expenses for select to authenticated using (private.is_flat_member(flat_id));
create policy expenses_insert on public.expenses for insert to authenticated with check (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = expenses.cycle_id and c.flat_id = expenses.flat_id and c.status = 'open'));
create policy expenses_update on public.expenses for update to authenticated using (private.is_flat_manager(flat_id)) with check (private.is_flat_manager(flat_id));
create policy expenses_delete on public.expenses for delete to authenticated using (private.is_flat_manager(flat_id) and exists (select 1 from public.cycles c where c.id = expenses.cycle_id and c.flat_id = expenses.flat_id and c.status = 'open'));
create policy contributions_select on public.contributions for select to authenticated using (private.is_flat_member(flat_id));
create policy contributions_insert on public.contributions for insert to authenticated with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)) and exists (select 1 from public.cycles c where c.id = contributions.cycle_id and c.flat_id = contributions.flat_id and c.status = 'open'));
create policy contributions_update on public.contributions for update to authenticated using (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))) with check (private.is_flat_member(flat_id) and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id)));
create policy contributions_delete on public.contributions for delete to authenticated using (private.is_flat_manager(flat_id));
create policy settlements_select on public.settlements for select to authenticated using (private.is_flat_member(flat_id));
-- public.invitations was never part of the replayable schema. Invite RLS is defined
-- later on the canonical public.invite_codes table, so do not reference a phantom table here.
create policy notifications_select on public.notifications for select to authenticated using (user_id = (select auth.uid()) and private.is_flat_member(flat_id));
create policy notifications_update on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy audit_logs_admin_select on public.audit_logs for select to authenticated using (private.is_flat_admin(flat_id));
create policy avatars_self_all on storage.objects for all to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy receipts_member_select on storage.objects for select to authenticated using (bucket_id = 'receipts' and private.is_flat_member(((storage.foldername(name))[1])::uuid));
create policy receipts_manager_insert on storage.objects for insert to authenticated with check (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid));
create policy receipts_manager_update on storage.objects for update to authenticated using (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid)) with check (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid));
create policy receipts_manager_delete on storage.objects for delete to authenticated using (bucket_id = 'receipts' and private.is_flat_manager(((storage.foldername(name))[1])::uuid));

do $outer$
begin
  execute $sql$create or replace function private.close_cycle_internal(p_cycle_id uuid)
  returns uuid language plpgsql security definer set search_path = '' as $fn$
  declare v_uid uuid := (select auth.uid()); v_flat uuid; v_status text; v_start date; v_end date; v_food numeric(10,2); v_rate numeric(10,6); r record; v_meals int; v_contrib numeric(10,2); v_balance numeric(10,2); v_opening numeric(10,2); v_next uuid; v_len integer;
  begin
    if v_uid is null then raise exception 'not_authenticated'; end if;
    select c.flat_id,c.status,c.start_date,c.end_date,c.end_date-c.start_date+1 into v_flat,v_status,v_start,v_end,v_len from public.cycles c where c.id=p_cycle_id for update;
    if v_flat is null then raise exception 'cycle_not_found'; end if;
    if not private.is_flat_manager(v_flat) then raise exception 'forbidden'; end if;
    if v_status <> 'open' then select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1; return v_next; end if;
    select coalesce(sum(e.amount),0) into v_food from public.expenses e where e.cycle_id=p_cycle_id and e.category='grocery';
    select coalesce(v_food/nullif(sum(public.effective_meal_count(p_cycle_id,cm.user_id)),0),0) into v_rate from public.cycle_members cm where cm.cycle_id=p_cycle_id;
    for r in select cm.user_id,cm.opening_balance from public.cycle_members cm where cm.cycle_id=p_cycle_id loop
      v_meals := public.effective_meal_count(p_cycle_id,r.user_id);
      select coalesce(sum(amount),0) into v_contrib from public.contributions where cycle_id=p_cycle_id and user_id=r.user_id;
      v_opening := r.opening_balance;
      v_balance := round(v_opening + v_contrib - (v_meals*v_rate),2);
      insert into public.settlements(cycle_id,flat_id,user_id,total_meals,meal_cost,total_contribution,opening_balance,balance) values(p_cycle_id,v_flat,r.user_id,v_meals,round(v_meals*v_rate,2),v_contrib,v_opening,v_balance) on conflict(cycle_id,user_id) do nothing;
      update public.cycle_members set closing_balance=v_balance where cycle_id=p_cycle_id and user_id=r.user_id;
    end loop;
    update public.cycles set status='closed' where id=p_cycle_id;
    select id into v_next from public.cycles where flat_id=v_flat and start_date=v_end+1;
    if v_next is null then
      insert into public.cycles(flat_id,start_date,end_date,status) values(v_flat,v_end+1,v_end+v_len,'open') returning id into v_next;
      insert into public.cycle_members(cycle_id,user_id,opening_balance,active_from) select v_next,s.user_id,s.balance,v_end+1 from public.settlements s where s.cycle_id=p_cycle_id;
    end if;
    return v_next;
  end; $fn$;
$sql$;
  execute 'drop function if exists public.close_cycle(uuid)';
  execute $sql$create function public.close_cycle(p_cycle_id uuid)
  returns uuid language sql security invoker set search_path = '' as $fn$
    select private.close_cycle_internal(p_cycle_id)
  $fn$;
$sql$;
  execute 'revoke all on function public.close_cycle(uuid) from public';
  execute 'grant execute on function public.close_cycle(uuid) to authenticated';
end
$outer$;

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
