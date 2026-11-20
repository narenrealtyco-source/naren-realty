create table if not exists public.health_collection_partner_applications (
 id uuid primary key default gen_random_uuid(),
 business_name text not null,
 contact_name text not null,
 phone text not null,
 email text not null,
 address text not null,
 service_areas text[] not null default '{}',
 gstin text,
 pan text,
 notes text,
 status text not null default 'pending_review' check(status in ('pending_review','approved','rejected')),
 review_note text,
 reviewed_at timestamptz,
 created_partner_id uuid references public.health_collection_partners(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists health_collection_partner_applications_status_idx on public.health_collection_partner_applications(status,created_at desc);
alter table public.health_collection_partner_applications enable row level security;
revoke all on public.health_collection_partner_applications from anon,authenticated;
grant all on public.health_collection_partner_applications to service_role;
