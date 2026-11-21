-- REVIEW-ONLY PROPOSAL: customer favourites.
-- Do not run until the live schema is checked for an existing favourites table.
--
-- This creates no foreign key to properties because the live properties.id
-- type/constraint has not been confirmed in the repository.

create table if not exists public.customer_favourites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null,
  created_at timestamptz not null default now(),
  unique (customer_id, property_id)
);

create index if not exists customer_favourites_customer_id_idx
  on public.customer_favourites (customer_id);

alter table public.customer_favourites enable row level security;

grant select, insert, update, delete
  on table public.customer_favourites
  to authenticated;
revoke all
  on table public.customer_favourites
  from anon;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_favourites'
      and policyname = 'customer_favourites_select_own'
  ) then
    execute '
      create policy customer_favourites_select_own
        on public.customer_favourites for select
        to authenticated
        using (customer_id = auth.uid() or public.is_admin())
    ';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_favourites'
      and policyname = 'customer_favourites_insert_own'
  ) then
    execute '
      create policy customer_favourites_insert_own
        on public.customer_favourites for insert
        to authenticated
        with check (customer_id = auth.uid())
    ';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_favourites'
      and policyname = 'customer_favourites_update_own'
  ) then
    execute '
      create policy customer_favourites_update_own
        on public.customer_favourites for update
        to authenticated
        using (customer_id = auth.uid() or public.is_admin())
        with check (customer_id = auth.uid() or public.is_admin())
    ';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_favourites'
      and policyname = 'customer_favourites_delete_own'
  ) then
    execute '
      create policy customer_favourites_delete_own
        on public.customer_favourites for delete
        to authenticated
        using (customer_id = auth.uid() or public.is_admin())
    ';
  end if;
end;
$$;
