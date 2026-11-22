alter table public.event_submissions
  add column if not exists commission_terms_accepted_at timestamptz;
