alter table public.event_submissions
  add column if not exists event_details jsonb not null default '{}'::jsonb;

alter table public.event_submissions
  add constraint event_submissions_event_details_object_check
  check (jsonb_typeof(event_details) = 'object');