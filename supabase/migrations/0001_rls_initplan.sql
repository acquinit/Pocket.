-- Cache auth.uid() per query instead of re-evaluating it for every row.
drop policy if exists "Users can read their own records" on public.records;
create policy "Users can read their own records"
  on public.records for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own records" on public.records;
create policy "Users can insert their own records"
  on public.records for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own records" on public.records;
create policy "Users can update their own records"
  on public.records for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own records" on public.records;
create policy "Users can delete their own records"
  on public.records for delete
  to authenticated
  using ((select auth.uid()) = user_id);
