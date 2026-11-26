-- Pocket records. One row per record, scoped to a Supabase auth user.
create table if not exists public.records (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  kind text not null,
  payload text not null,
  version integer not null default 1,
  primary key (user_id, id)
);

-- The application uses a direct Postgres connection and always filters by the
-- verified session's user id. These policies protect the same table when it is
-- reached through Supabase's data API.
alter table public.records enable row level security;

drop policy if exists "Users can read their own records" on public.records;
create policy "Users can read their own records"
  on public.records for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own records" on public.records;
create policy "Users can insert their own records"
  on public.records for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own records" on public.records;
create policy "Users can update their own records"
  on public.records for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own records" on public.records;
create policy "Users can delete their own records"
  on public.records for delete
  to authenticated
  using (auth.uid() = user_id);
