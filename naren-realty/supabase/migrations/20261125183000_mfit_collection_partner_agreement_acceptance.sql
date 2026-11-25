alter table public.health_collection_partner_applications
  add column if not exists agreement_accepted boolean not null default false,
  add column if not exists agreement_version text,
  add column if not exists agreement_accepted_at timestamptz;

comment on column public.health_collection_partner_applications.agreement_accepted is 'Whether applicant accepted the MFIT Collection Partner Agreement at application submission.';
comment on column public.health_collection_partner_applications.agreement_version is 'Exact agreement version accepted by the applicant.';
comment on column public.health_collection_partner_applications.agreement_accepted_at is 'Server-recorded timestamp of agreement acceptance.';
