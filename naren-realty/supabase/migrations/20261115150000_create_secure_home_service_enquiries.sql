create table if not exists public.home_service_enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  service text not null check (service in ('home-interior', 'legal-services', 'home-loan', 'nri-services')),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  mobile_number text not null check (mobile_number ~ '^(\\+91)?[6-9][0-9]{9}$'),
  requirement text not null check (char_length(btrim(requirement)) between 1 and 2000),
  preferred_time text not null default '' check (char_length(preferred_time) <= 120),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists home_service_enquiries_created_at_idx
  on public.home_service_enquiries (created_at desc);
create index if not exists home_service_enquiries_customer_id_idx
  on public.home_service_enquiries (customer_id);

alter table public.home_service_enquiries enable row level security;

drop policy if exists "Customers can submit their own home service enquiries" on public.home_service_enquiries;
create policy "Customers can submit their own home service enquiries"
  on public.home_service_enquiries for insert to authenticated
  with check (customer_id = (select auth.uid()));

drop policy if exists "Customers and admins can read home service enquiries" on public.home_service_enquiries;
create policy "Customers and admins can read home service enquiries"
  on public.home_service_enquiries for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Admins can update home service enquiries" on public.home_service_enquiries;
create policy "Admins can update home service enquiries"
  on public.home_service_enquiries for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert on public.home_service_enquiries to authenticated;
grant update (status) on public.home_service_enquiries to authenticated;
revoke all on public.home_service_enquiries from anon;
