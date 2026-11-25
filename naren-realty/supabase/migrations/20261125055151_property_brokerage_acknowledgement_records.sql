begin;

create table if not exists public.property_brokerage_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  party text not null check (party in ('Buyer','Seller','Tenant','Resident','Host')),
  category text not null check (category in ('Resale','Rental','PG','Airbnb')),
  policy_version text not null,
  statement text not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  constraint property_brokerage_acknowledgements_unique
    unique (enquiry_id, user_id, party, policy_version)
);

create index if not exists property_brokerage_acknowledgements_enquiry_idx
  on public.property_brokerage_acknowledgements (enquiry_id, created_at);

create index if not exists property_brokerage_acknowledgements_user_idx
  on public.property_brokerage_acknowledgements (user_id, acknowledged_at);

alter table public.property_brokerage_acknowledgements enable row level security;
revoke all on public.property_brokerage_acknowledgements from public, anon, authenticated;
grant select, insert on public.property_brokerage_acknowledgements to authenticated;
grant update (acknowledged_at) on public.property_brokerage_acknowledgements to authenticated;
grant select, insert, update, delete on public.property_brokerage_acknowledgements to service_role;

drop policy if exists "Users and admins can view brokerage acknowledgement records"
  on public.property_brokerage_acknowledgements;
create policy "Users and admins can view brokerage acknowledgement records"
  on public.property_brokerage_acknowledgements
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists "Only admins can prepare brokerage acknowledgement records"
  on public.property_brokerage_acknowledgements;
create policy "Only admins can prepare brokerage acknowledgement records"
  on public.property_brokerage_acknowledgements
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Users can acknowledge only their own pending record"
  on public.property_brokerage_acknowledgements;
create policy "Users can acknowledge only their own pending record"
  on public.property_brokerage_acknowledgements
  for update to authenticated
  using ((select auth.uid()) = user_id and acknowledged_at is null)
  with check ((select auth.uid()) = user_id and acknowledged_at is not null);

commit;
