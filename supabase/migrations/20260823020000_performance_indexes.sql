-- Performance indexes for common membership, cycle and accounting lookups.
create index if not exists flat_members_user_status_idx
on public.flat_members(user_id, status);

create index if not exists flat_members_flat_status_idx
on public.flat_members(flat_id, status);

create index if not exists cycles_flat_status_idx
on public.cycles(flat_id, status);

create index if not exists meal_logs_cycle_user_date_idx
on public.meal_logs(cycle_id, user_id, date);

create index if not exists expenses_cycle_idx
on public.expenses(cycle_id);

create index if not exists contributions_cycle_user_idx
on public.contributions(cycle_id, user_id);
