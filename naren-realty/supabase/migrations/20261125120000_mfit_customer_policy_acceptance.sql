alter table public.health_booking_requests
  add column if not exists customer_policy_accepted boolean not null default false,
  add column if not exists customer_policy_version text,
  add column if not exists customer_policy_accepted_at timestamptz;

comment on column public.health_booking_requests.customer_policy_accepted is 'Whether the customer accepted the MFIT customer terms at booking request submission.';
comment on column public.health_booking_requests.customer_policy_version is 'Exact MFIT customer policy version accepted by the customer.';
comment on column public.health_booking_requests.customer_policy_accepted_at is 'Server timestamp when the customer policy acceptance was recorded.';
