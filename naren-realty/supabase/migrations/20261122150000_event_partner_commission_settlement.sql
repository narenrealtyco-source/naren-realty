-- Event Partner 10% platform commission and manual settlement ledger.
-- Ticket payments remain directly with organisers; commission is transferred separately to NAREN REALTY.

create table if not exists public.event_commission_settings (
  id boolean primary key default true check (id = true),
  commission_percent numeric(5,2) not null default 10.00 check (commission_percent > 0 and commission_percent <= 100),
  payment_upi_id text,
  payee_name text,
  qr_image_url text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.event_commission_settings (id, commission_percent)
values (true, 10.00)
on conflict (id) do nothing;

alter table public.event_commission_settings enable row level security;

create policy "Authenticated users can view event commission payment instructions"
  on public.event_commission_settings for select
  to authenticated
  using (true);

create policy "Only admins can update event commission settings"
  on public.event_commission_settings for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

grant select on public.event_commission_settings to authenticated;
grant update on public.event_commission_settings to authenticated;

create table if not exists public.event_ticket_sales (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_submissions(id) on delete cascade,
  organiser_id uuid not null references auth.users(id) on delete cascade,
  paid_attendee_count integer not null check (paid_attendee_count > 0 and paid_attendee_count <= 100000),
  ticket_unit_price numeric(12,2) not null check (ticket_unit_price > 0),
  collection_method text not null check (collection_method in ('upi','bank_transfer','cash','other')),
  total_ticket_amount numeric(14,2) generated always as (round(paid_attendee_count * ticket_unit_price, 2)) stored,
  commission_percent numeric(5,2) not null default 10.00 check (commission_percent = 10.00),
  commission_amount numeric(14,2) generated always as (round(paid_attendee_count * ticket_unit_price * 0.10, 2)) stored,
  organiser_net_amount numeric(14,2) generated always as (round(paid_attendee_count * ticket_unit_price * 0.90, 2)) stored,
  commission_payment_reference text not null check (length(btrim(commission_payment_reference)) between 4 and 120),
  commission_payment_status text not null default 'pending' check (commission_payment_status in ('pending','verified','rejected')),
  organiser_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  constraint event_ticket_sales_organiser_net_nonnegative check (organiser_net_amount >= 0)
);

create index if not exists event_ticket_sales_event_id_created_at_idx
  on public.event_ticket_sales (event_id, created_at desc);
create index if not exists event_ticket_sales_organiser_id_created_at_idx
  on public.event_ticket_sales (organiser_id, created_at desc);
create index if not exists event_ticket_sales_status_idx
  on public.event_ticket_sales (commission_payment_status);

alter table public.event_ticket_sales enable row level security;

create policy "Organisers can view their event ticket sales"
  on public.event_ticket_sales for select
  to authenticated
  using (organiser_id = (select auth.uid()));

create policy "Admins can view all event ticket sales"
  on public.event_ticket_sales for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "Organisers can report paid ticket sales and commission transfer"
  on public.event_ticket_sales for insert
  to authenticated
  with check (
    organiser_id = (select auth.uid())
    and commission_percent = 10.00
    and commission_payment_status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1
      from public.event_submissions e
      where e.id = event_id
        and e.submitted_by = (select auth.uid())
        and e.status = 'approved'
        and e.ticket_price = ticket_unit_price
        and e.ticket_price > 0
    )
  );

create policy "Only admins can review event commission payments"
  on public.event_ticket_sales for update
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')
    and commission_payment_status in ('pending','verified','rejected')
  );

grant select, insert on public.event_ticket_sales to authenticated;
grant update (commission_payment_status, reviewed_by, reviewed_at, admin_note) on public.event_ticket_sales to authenticated;
