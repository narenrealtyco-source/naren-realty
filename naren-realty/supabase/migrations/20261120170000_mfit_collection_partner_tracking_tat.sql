-- Sample custody tracking and 24x7 lab turnaround-time management for MFIT collection partner bookings.
alter table public.health_catalog_items
  add column if not exists report_tat_hours numeric(7,2)
  check (report_tat_hours is null or report_tat_hours between 0.25 and 720);

alter table public.health_booking_requests
  add column if not exists sample_collected_at timestamptz,
  add column if not exists sample_collected_by uuid references auth.users(id) on delete set null,
  add column if not exists lab_received_at timestamptz,
  add column if not exists lab_received_by uuid references auth.users(id) on delete set null,
  add column if not exists report_due_at timestamptz,
  add column if not exists report_tat_hours numeric(7,2),
  add column if not exists report_submitted_at timestamptz,
  add column if not exists partner_tracking_note text;

create index if not exists health_booking_requests_partner_tracking_idx
  on public.health_booking_requests(collection_partner_id, sample_status, report_due_at);

create table if not exists public.health_booking_request_tracking_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.health_booking_requests(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text not null check (actor_role in ('collection_partner','lab','admin','system')),
  actor_partner_id uuid references public.health_collection_partners(id) on delete set null,
  event_key text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists health_booking_request_tracking_events_request_idx
  on public.health_booking_request_tracking_events(request_id, created_at);

alter table public.health_booking_request_tracking_events enable row level security;
revoke all on public.health_booking_request_tracking_events from anon, authenticated;
grant all on public.health_booking_request_tracking_events to service_role;

comment on column public.health_booking_requests.report_due_at is
  'Frozen 24x7 report deadline calculated from lab_received_at and the maximum configured item TAT at sample receipt.';
comment on column public.health_catalog_items.report_tat_hours is
  'Admin-configured report turnaround time in elapsed hours; weekends and holidays are included.';
comment on table public.health_booking_request_tracking_events is
  'Audit trail for partner collection, lab receiving, processing and report submission events.';
