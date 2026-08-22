-- Transparent, append-only activity trail.

alter table public.flats
  add column if not exists audit_visibility text not null default 'members'
  check (audit_visibility in ('members','managers'));

alter table public.audit_logs enable row level security;
revoke insert, update, delete on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;

drop policy if exists audit_logs_select_member on public.audit_logs;
create policy audit_logs_select_member on public.audit_logs
for select to authenticated
using (
  exists (
    select 1
      from public.flats f
     where f.id = audit_logs.flat_id
       and (
         (f.audit_visibility = 'members' and private.is_flat_member(f.id))
         or (f.audit_visibility = 'managers' and private.is_flat_manager(f.id))
       )
  )
);

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;

create or replace function private.audit_event_for_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_flat uuid;
  v_user uuid;
  v_entity uuid;
  v_metadata jsonb := '{}'::jsonb;
  v_action text;
  v_entity_type text := tg_table_name;
begin
  if tg_op = 'DELETE' then
    v_flat := coalesce((old).flat_id, (old).cycle_id);
  else
    v_flat := coalesce((new).flat_id, (new).cycle_id);
  end if;

  if tg_table_name = 'cycle_closed_days' then
    select c.flat_id into v_flat from public.cycles c where c.id = coalesce((new).cycle_id, (old).cycle_id);
    v_entity := coalesce((new).id, (old).id);
    v_action := case tg_op when 'INSERT' then 'calendar.closed_day_added' when 'UPDATE' then 'calendar.closed_day_updated' else 'calendar.closed_day_removed' end;
    v_metadata := jsonb_build_object('date', coalesce((new).date, (old).date), 'reason', coalesce((new).reason, (old).reason));
  elsif tg_table_name = 'meal_logs' then
    v_flat := coalesce((new).flat_id, (old).flat_id);
    v_user := coalesce((new).user_id, (old).user_id);
    v_entity := coalesce((new).id, (old).id);
    v_action := case tg_op when 'INSERT' then 'meal.logged' when 'UPDATE' then 'meal.updated' else 'meal.removed' end;
    v_metadata := jsonb_build_object('date', coalesce((new).date, (old).date), 'meal_type', coalesce((new).meal_type, (old).meal_type), 'count', coalesce((new).count, (old).count), 'user_id', v_user);
  elsif tg_table_name = 'expenses' then
    v_flat := coalesce((new).flat_id, (old).flat_id);
    v_entity := coalesce((new).id, (old).id);
    v_action := case tg_op when 'INSERT' then 'expense.added' when 'UPDATE' then 'expense.updated' else 'expense.removed' end;
    v_metadata := jsonb_build_object('amount', coalesce((new).amount, (old).amount), 'category', coalesce((new).category, (old).category), 'note', coalesce((new).note, (old).note));
  elsif tg_table_name = 'contributions' then
    v_flat := coalesce((new).flat_id, (old).flat_id);
    v_user := coalesce((new).user_id, (old).user_id);
    v_entity := coalesce((new).id, (old).id);
    v_action := case tg_op when 'INSERT' then 'contribution.recorded' when 'UPDATE' then 'contribution.updated' else 'contribution.removed' end;
    v_metadata := jsonb_build_object('amount', coalesce((new).amount, (old).amount), 'user_id', v_user, 'note', coalesce((new).note, (old).note));
  elsif tg_table_name = 'settlement_payments' then
    v_flat := coalesce((new).flat_id, (old).flat_id);
    v_user := coalesce((new).user_id, (old).user_id);
    v_entity := coalesce((new).id, (old).id);
    v_action := case tg_op when 'INSERT' then 'settlement.payment_recorded' when 'UPDATE' then 'settlement.payment_updated' else 'settlement.payment_removed' end;
    v_metadata := jsonb_build_object('amount', coalesce((new).amount, (old).amount), 'direction', coalesce((new).direction, (old).direction), 'user_id', v_user, 'note', coalesce((new).note, (old).note));
  elsif tg_table_name = 'guest_meals' then
    v_flat := coalesce((new).flat_id, (old).flat_id);
    v_user := coalesce((new).host_user_id, (old).host_user_id);
    v_entity := coalesce((new).id, (old).id);
    v_action := case tg_op when 'INSERT' then 'guest_meal.added' when 'UPDATE' then 'guest_meal.updated' else 'guest_meal.removed' end;
    v_metadata := jsonb_build_object('date', coalesce((new).meal_date, (old).meal_date), 'meal_type', coalesce((new).meal_type, (old).meal_type), 'guest_count', coalesce((new).guest_count, (old).guest_count), 'status', coalesce((new).status, (old).status), 'host_user_id', v_user);
  elsif tg_table_name = 'member_leave' then
    select c.flat_id into v_flat from public.cycles c where c.id = coalesce((new).cycle_id, (old).cycle_id);
    v_user := coalesce((new).user_id, (old).user_id);
    v_entity := coalesce((new).id, (old).id);
    v_action := case tg_op when 'INSERT' then 'vacation.requested' when 'UPDATE' then 'vacation.updated' else 'vacation.removed' end;
    v_metadata := jsonb_build_object('start_date', coalesce((new).start_date, (old).start_date), 'end_date', coalesce((new).end_date, (old).end_date), 'status', coalesce((new).status, (old).status), 'user_id', v_user);
  else
    return coalesce(new, old);
  end if;

  if v_actor is null then
    v_actor := coalesce((new).created_by, (old).created_by, (new).recorded_by, (old).recorded_by, (new).approved_by, (old).approved_by, v_user);
  end if;

  if v_flat is null or v_actor is null then
    return coalesce(new, old);
  end if;

  insert into public.audit_logs(flat_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_flat, v_actor, v_action, v_entity_type, v_entity, v_metadata);

  return coalesce(new, old);
end;
$$;

-- Existing cycle-close entries remain explicit; these triggers cover ordinary mutations.
drop trigger if exists audit_meal_logs on public.meal_logs;
create trigger audit_meal_logs after insert or update or delete on public.meal_logs
for each row execute function private.audit_event_for_row();

drop trigger if exists audit_expenses on public.expenses;
create trigger audit_expenses after insert or update or delete on public.expenses
for each row execute function private.audit_event_for_row();

drop trigger if exists audit_contributions on public.contributions;
create trigger audit_contributions after insert or update or delete on public.contributions
for each row execute function private.audit_event_for_row();

drop trigger if exists audit_settlement_payments on public.settlement_payments;
create trigger audit_settlement_payments after insert or update or delete on public.settlement_payments
for each row execute function private.audit_event_for_row();

drop trigger if exists audit_cycle_closed_days on public.cycle_closed_days;
create trigger audit_cycle_closed_days after insert or update or delete on public.cycle_closed_days
for each row execute function private.audit_event_for_row();

drop trigger if exists audit_guest_meals on public.guest_meals;
create trigger audit_guest_meals after insert or update or delete on public.guest_meals
for each row execute function private.audit_event_for_row();

drop trigger if exists audit_member_leave on public.member_leave;
create trigger audit_member_leave after insert or update or delete on public.member_leave
for each row execute function private.audit_event_for_row();

-- Audit records are append-only for normal clients. Only the privileged trigger function can create them.
revoke all on function private.audit_event_for_row() from public;
grant execute on function private.audit_event_for_row() to authenticated;

create or replace function public.update_audit_visibility(p_flat_id uuid, p_visibility text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not private.is_flat_manager(p_flat_id) then raise exception 'forbidden'; end if;
  if p_visibility not in ('members','managers') then raise exception 'invalid_audit_visibility'; end if;
  update public.flats set audit_visibility=p_visibility, updated_at=now() where id=p_flat_id;
end;
$$;

revoke all on function public.update_audit_visibility(uuid,text) from public;
grant execute on function public.update_audit_visibility(uuid,text) to authenticated;
