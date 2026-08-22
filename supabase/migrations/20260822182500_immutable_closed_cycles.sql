-- Preserve closed-cycle settlement snapshots by making historical accounting rows immutable.
-- Updates must keep both the existing row and the replacement row in an open cycle.
-- Deletes are allowed only while the existing row belongs to an open cycle.

alter policy meal_logs_update on public.meal_logs
  using (
    private.is_flat_member(flat_id)
    and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))
    and exists (
      select 1
      from public.cycles c
      where c.id = meal_logs.cycle_id
        and c.flat_id = meal_logs.flat_id
        and c.status = 'open'
    )
  )
  with check (
    private.is_flat_member(flat_id)
    and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))
    and exists (
      select 1
      from public.cycles c
      where c.id = meal_logs.cycle_id
        and c.flat_id = meal_logs.flat_id
        and c.status = 'open'
    )
  );

drop policy if exists meal_logs_delete on public.meal_logs;
create policy meal_logs_delete on public.meal_logs
for delete to authenticated
using (
  private.is_flat_manager(flat_id)
  and exists (
    select 1
    from public.cycles c
    where c.id = meal_logs.cycle_id
      and c.flat_id = meal_logs.flat_id
      and c.status = 'open'
  )
);

alter policy expenses_update on public.expenses
  using (
    private.is_flat_manager(flat_id)
    and exists (
      select 1
      from public.cycles c
      where c.id = expenses.cycle_id
        and c.flat_id = expenses.flat_id
        and c.status = 'open'
    )
  )
  with check (
    private.is_flat_manager(flat_id)
    and exists (
      select 1
      from public.cycles c
      where c.id = expenses.cycle_id
        and c.flat_id = expenses.flat_id
        and c.status = 'open'
    )
  );

drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses
for delete to authenticated
using (
  private.is_flat_manager(flat_id)
  and exists (
    select 1
    from public.cycles c
    where c.id = expenses.cycle_id
      and c.flat_id = expenses.flat_id
      and c.status = 'open'
  )
);

alter policy contributions_update on public.contributions
  using (
    private.is_flat_member(flat_id)
    and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))
    and exists (
      select 1
      from public.cycles c
      where c.id = contributions.cycle_id
        and c.flat_id = contributions.flat_id
        and c.status = 'open'
    )
  )
  with check (
    private.is_flat_member(flat_id)
    and (user_id = (select auth.uid()) or private.is_flat_manager(flat_id))
    and exists (
      select 1
      from public.cycles c
      where c.id = contributions.cycle_id
        and c.flat_id = contributions.flat_id
        and c.status = 'open'
    )
  );

drop policy if exists contributions_delete on public.contributions;
create policy contributions_delete on public.contributions
for delete to authenticated
using (
  private.is_flat_manager(flat_id)
  and exists (
    select 1
    from public.cycles c
    where c.id = contributions.cycle_id
      and c.flat_id = contributions.flat_id
      and c.status = 'open'
  )
);
