-- Independent white-label collection partner network for MFIT
-- Partner-facing acquisition/collection is separate from MFIT's internal lab staff.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role = any (array['customer','owner','admin','manager','lab','collection_partner']::text[]));

create table if not exists public.health_collection_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  public_slug text not null unique,
  display_name text not null,
  contact_name text,
  phone text,
  email text,
  service_areas text[] not null default '{}',
  customer_payment_methods text[] not null default array['cash','upi']::text[],
  is_active boolean not null default true,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_collection_partners_slug_format check (public_slug ~ '^[a-z0-9][a-z0-9-]{2,49}$')
);

create table if not exists public.health_collection_partner_rates (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.health_collection_partners(id) on delete cascade,
  catalog_item_id uuid not null references public.health_catalog_items(id) on delete restrict,
  b2b_price numeric(10,2) not null check (b2b_price >= 0),
  customer_price numeric(10,2) check (customer_price is null or customer_price >= b2b_price),
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(partner_id,catalog_item_id)
);

alter table public.health_booking_requests
  add column if not exists collection_partner_id uuid references public.health_collection_partners(id) on delete set null,
  add column if not exists partner_reference text,
  add column if not exists partner_customer_amount numeric(10,2),
  add column if not exists partner_customer_payment_method text,
  add column if not exists partner_customer_payment_status text not null default 'not_recorded',
  add column if not exists partner_b2b_amount numeric(10,2),
  add column if not exists partner_b2b_payment_status text not null default 'unpaid',
  add column if not exists partner_b2b_paid_at timestamptz;

create unique index if not exists health_booking_requests_partner_reference_uidx
  on public.health_booking_requests(partner_reference) where partner_reference is not null;
create index if not exists health_booking_requests_collection_partner_idx
  on public.health_booking_requests(collection_partner_id,created_at desc);

create table if not exists public.health_collection_partner_payments (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.health_collection_partners(id) on delete restrict,
  booking_request_id uuid not null references public.health_booking_requests(id) on delete restrict,
  gateway text not null default 'cashfree',
  gateway_order_id text not null unique,
  gateway_payment_session_id text,
  gateway_payment_id text,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(booking_request_id)
);

create index if not exists health_collection_partner_payments_partner_idx
  on public.health_collection_partner_payments(partner_id,status,created_at desc);

alter table public.health_collection_partners enable row level security;
alter table public.health_collection_partner_rates enable row level security;
alter table public.health_collection_partner_payments enable row level security;

revoke all on public.health_collection_partners from anon, authenticated;
revoke all on public.health_collection_partner_rates from anon, authenticated;
revoke all on public.health_collection_partner_payments from anon, authenticated;
grant all on public.health_collection_partners to service_role;
grant all on public.health_collection_partner_rates to service_role;
grant all on public.health_collection_partner_payments to service_role;

comment on table public.health_collection_partners is 'Freelance collection partners with white-label booking links; separate from internal MFIT lab partners.';
comment on table public.health_collection_partner_rates is 'Per-partner B2B payable and optional retail price for each MFIT catalogue item.';
comment on table public.health_collection_partner_payments is 'Cashfree settlement payments collected from collection partners for MFIT B2B dues.';
