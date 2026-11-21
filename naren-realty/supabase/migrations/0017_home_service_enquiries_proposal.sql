-- REVIEW ONLY. Verify existing profiles role protection, all effective grants,
-- RLS policies and function ownership against the target before applying.
begin;

create table public.home_service_enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id),
  service text not null check (service in ('builder-projects', 'home-interior', 'legal-services', 'home-loan', 'nri-services')),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  mobile_number text not null check (mobile_number ~ '^([6-9][0-9]{9}|\+91[6-9][0-9]{9})$'),
  requirement text not null check (char_length(btrim(requirement)) between 1 and 2000),
  preferred_time text not null default '' check (char_length(preferred_time) <= 120),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.home_service_enquiries enable row level security;
revoke all on public.home_service_enquiries from public, anon, authenticated;
grant select on public.home_service_enquiries to authenticated;
grant insert (service, customer_name, mobile_number, requirement, preferred_time)
  on public.home_service_enquiries to authenticated;
grant update (status) on public.home_service_enquiries to authenticated;

create policy "Customers read own service enquiries"
  on public.home_service_enquiries for select to authenticated
  using (customer_id = auth.uid());
create policy "Admins read service enquiries"
  on public.home_service_enquiries for select to authenticated
  using (public.is_admin());
create policy "Customers create own service enquiries"
  on public.home_service_enquiries for insert to authenticated
  with check (customer_id = auth.uid() and status = 'pending');
create policy "Admins update service enquiry status"
  on public.home_service_enquiries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

commit;
