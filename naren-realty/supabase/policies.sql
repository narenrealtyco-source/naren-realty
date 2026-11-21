create extension if not exists pgcrypto;

create table if not exists public.policy_documents (
  policy_type text primary key check (policy_type in (
    'customer_terms', 'owner_terms', 'pg_hostel_policy',
    'airbnb_policy', 'privacy_policy', 'brokerage_policy'
  )),
  title text not null,
  version text not null,
  last_updated date not null default current_date,
  content jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.policy_documents (policy_type, title, version, last_updated)
values
  ('customer_terms', 'Customer Terms & Conditions', '1.0', current_date),
  ('owner_terms', 'Property Owner Terms & Conditions', '1.0', current_date),
  ('pg_hostel_policy', 'PG / Hostel Policy', '1.0', current_date),
  ('airbnb_policy', 'Airbnb / Short-Stay Policy', '1.0', current_date),
  ('privacy_policy', 'Privacy Policy', '1.0', current_date),
  ('brokerage_policy', 'Brokerage Policy', '1.0', current_date)
on conflict (policy_type) do nothing;

create table if not exists public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_role text not null check (user_role in ('customer', 'owner')),
  policy_type text not null references public.policy_documents(policy_type),
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  brokerage_category text check (brokerage_category in ('Rental', 'Resale', 'PG', 'Airbnb')),
  transaction_reference text,
  unique (user_id, user_role, policy_type, policy_version, transaction_reference)
);

create table if not exists public.brokerage_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  transaction_reference text not null,
  listing_id text not null,
  category text not null check (category in ('Rental', 'Resale', 'PG', 'Airbnb')),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_role text not null check (user_role in ('customer', 'owner')),
  party text not null check (party in ('Buyer', 'Seller', 'Tenant', 'Resident', 'PG / Hostel Owner', 'Host')),
  policy_version text not null,
  statement text not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  unique (transaction_reference, user_id, party, policy_version)
);

create or replace function public.is_naren_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

alter table public.policy_documents enable row level security;
alter table public.policy_acceptances enable row level security;
alter table public.brokerage_acknowledgements enable row level security;

 drop policy if exists "policy documents are readable" on public.policy_documents;
create policy "policy documents are readable"
  on public.policy_documents for select
  to anon, authenticated
  using (true);

drop policy if exists "only admins manage policy documents" on public.policy_documents;
create policy "only admins manage policy documents"
  on public.policy_documents for all
  to authenticated
  using (public.is_naren_admin())
  with check (public.is_naren_admin());

drop policy if exists "users and admins read policy acceptances" on public.policy_acceptances;
create policy "users and admins read policy acceptances"
  on public.policy_acceptances for select
  to authenticated
  using (user_id = auth.uid() or public.is_naren_admin());

drop policy if exists "users and admins read brokerage acknowledgements" on public.brokerage_acknowledgements;
create policy "users and admins read brokerage acknowledgements"
  on public.brokerage_acknowledgements for select
  to authenticated
  using (user_id = auth.uid() or public.is_naren_admin());

revoke insert, update, delete on public.policy_acceptances from anon, authenticated;
revoke insert, update, delete on public.brokerage_acknowledgements from anon, authenticated;

drop function if exists public.accept_current_policy(text, text, text, text);
create function public.accept_current_policy(
  p_policy_type text,
  p_user_role text,
  p_brokerage_category text default null,
  p_transaction_reference text default null
)
returns public.policy_acceptances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.policy_documents;
  v_user_role text;
  v_acceptance public.policy_acceptances;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  v_user_role := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  if v_user_role <> p_user_role or p_user_role not in ('customer', 'owner') then
    raise exception 'Role does not match authenticated account';
  end if;
  select * into v_policy from public.policy_documents where policy_type = p_policy_type;
  if not found then raise exception 'Unknown policy type'; end if;
  insert into public.policy_acceptances (
    user_id, user_role, policy_type, policy_version, accepted_at, brokerage_category, transaction_reference
  ) values (
    auth.uid(), p_user_role, p_policy_type, v_policy.version, now(), p_brokerage_category, p_transaction_reference
  ) on conflict do nothing returning * into v_acceptance;
  if v_acceptance.id is null then
    select * into v_acceptance from public.policy_acceptances
    where user_id = auth.uid() and user_role = p_user_role and policy_type = p_policy_type
      and policy_version = v_policy.version and transaction_reference is not distinct from p_transaction_reference
    limit 1;
  end if;
  return v_acceptance;
end;
$$;

revoke all on function public.accept_current_policy(text, text, text, text) from public;
grant execute on function public.accept_current_policy(text, text, text, text) to authenticated;

drop function if exists public.acknowledge_brokerage(uuid);
create function public.acknowledge_brokerage(p_acknowledgement_id uuid)
returns public.brokerage_acknowledgements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.brokerage_acknowledgements;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.brokerage_acknowledgements
  set acknowledged_at = coalesce(acknowledged_at, now())
  where id = p_acknowledgement_id and user_id = auth.uid()
  returning * into v_record;
  if not found then raise exception 'Acknowledgement not assigned to this account'; end if;
  return v_record;
end;
$$;

revoke all on function public.acknowledge_brokerage(uuid) from public;
grant execute on function public.acknowledge_brokerage(uuid) to authenticated;

drop function if exists public.prepare_brokerage_acknowledgement(text, text, text, uuid, text, text, text);
create function public.prepare_brokerage_acknowledgement(
  p_transaction_reference text,
  p_listing_id text,
  p_category text,
  p_user_id uuid,
  p_user_role text,
  p_party text,
  p_statement text
)
returns public.brokerage_acknowledgements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.policy_documents;
  v_record public.brokerage_acknowledgements;
begin
  if not public.is_naren_admin() then raise exception 'Admin authorization required'; end if;
  select * into v_policy from public.policy_documents where policy_type = 'brokerage_policy';
  insert into public.brokerage_acknowledgements (
    transaction_reference, listing_id, category, user_id, user_role, party, policy_version, statement
  ) values (
    p_transaction_reference, p_listing_id, p_category, p_user_id, p_user_role, p_party, v_policy.version, p_statement
  ) on conflict (transaction_reference, user_id, party, policy_version) do update
    set statement = excluded.statement
  returning * into v_record;
  return v_record;
end;
$$;

revoke all on function public.prepare_brokerage_acknowledgement(text, text, text, uuid, text, text, text) from public;
grant execute on function public.prepare_brokerage_acknowledgement(text, text, text, uuid, text, text, text) to authenticated;
