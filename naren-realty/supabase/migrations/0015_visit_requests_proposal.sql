-- REVIEW-ONLY PROPOSAL. Do not apply until the live profiles and properties
-- schema, profile role protection, and grants have been verified.
-- Requires public.profiles(id, role), public.properties(id, status), and auth.users.
begin;

create table public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id),
  property_id uuid not null references public.properties(id),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  mobile_number text not null check (mobile_number ~ '^(\+91)?[6-9][0-9]{9}$'),
  message text not null default '' check (char_length(message) <= 1000),
  visit_date date not null,
  visit_time time without time zone not null check (visit_time in ('10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rescheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create unique index visit_requests_one_active_per_property
  on public.visit_requests (customer_id, property_id)
  where status in ('pending', 'confirmed', 'rescheduled');
create index visit_requests_created_at on public.visit_requests (created_at desc);
alter table public.visit_requests enable row level security;

-- Only expose precisely the columns needed by the two workflows.
revoke all on public.visit_requests from public, anon, authenticated;
grant select on public.visit_requests to authenticated;
grant insert (customer_id, property_id, customer_name, mobile_number, message, visit_date, visit_time)
  on public.visit_requests to authenticated;
grant update (status, visit_date, visit_time) on public.visit_requests to authenticated;

create policy "visit customers read own"
  on public.visit_requests for select to authenticated
  using (customer_id = auth.uid());
create policy "visit admin read"
  on public.visit_requests for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "visit customers create"
  on public.visit_requests for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'pending'
    and visit_date between (now() at time zone 'Asia/Kolkata')::date and (now() at time zone 'Asia/Kolkata')::date + 90
    and visit_date + visit_time > now() at time zone 'Asia/Kolkata'
    and exists (select 1 from public.properties p where p.id = property_id and p.status = 'approved')
  );
create policy "visit admin update"
  on public.visit_requests for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

commit;
