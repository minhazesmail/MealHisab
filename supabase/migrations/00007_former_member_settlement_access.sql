-- Former members must retain read-only access to their own closed balances and payment history.
drop policy if exists settlements_select_member on public.settlements;
create policy settlements_select_member_or_owner on public.settlements for select to authenticated using (
  user_id = (select auth.uid()) or private.is_flat_member(flat_id)
);

drop policy if exists settlement_payments_select_member on public.settlement_payments;
create policy settlement_payments_select_member_or_owner on public.settlement_payments for select to authenticated using (
  user_id = (select auth.uid()) or private.is_flat_member(flat_id)
);
