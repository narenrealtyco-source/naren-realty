begin;

create table if not exists public.email_marketing_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  consent_status text not null default 'pending' check (consent_status in ('pending','subscribed','unsubscribed')),
  consent_source text,
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_marketing_consents_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  body_html text not null,
  campaign_type text not null check (campaign_type in ('greeting','promotion','update')),
  status text not null default 'draft' check (status in ('draft','sending','sent','partial','failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  consent_id uuid references public.email_marketing_consents(id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','delivered','bounced','complained','unsubscribed')),
  resend_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(campaign_id,email)
);

create index if not exists email_campaign_recipients_campaign_idx on public.email_campaign_recipients(campaign_id,status);
create index if not exists email_marketing_consents_status_idx on public.email_marketing_consents(consent_status);

alter table public.email_marketing_consents enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_campaign_recipients enable row level security;

revoke all on public.email_marketing_consents from anon, authenticated;
revoke all on public.email_campaigns from anon, authenticated;
revoke all on public.email_campaign_recipients from anon, authenticated;
grant all on public.email_marketing_consents to service_role;
grant all on public.email_campaigns to service_role;
grant all on public.email_campaign_recipients to service_role;

commit;
