-- REVIEW ONLY. This is state preparation, not a publication implementation.
-- Do not apply without reviewing 0009/0010 and the proposed publisher protocol.
begin;

alter table public.property_submissions
  add column publication_state text not null default 'not_started'
    check (publication_state in ('not_started', 'copying', 'failed', 'published')),
  add constraint property_submission_publication_status_check check (
    (publication_state = 'not_started' and published_property_id is null)
    or (publication_state in ('copying', 'failed') and status = 'approved' and published_property_id is null)
    or (publication_state = 'published' and status = 'approved' and published_property_id is not null)
  );
create unique index property_submissions_published_property_id_idx
  on public.property_submissions (published_property_id)
  where published_property_id is not null;

-- No writes or grants are added. Claim/finalize, leases and atomic publication
-- require a separate reviewed proposal and are intentionally not implemented.
commit;
