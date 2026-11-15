-- REVIEW ONLY. Requires reviewed and applied migration 0009.
-- Verify function ownership, profile role protection, RLS, and effective grants
-- in the target environment before approval. This does not publish listings.
begin;

create function public.review_property_submission(
  p_submission_id uuid,
  p_decision text,
  p_feedback text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_feedback text := pg_catalog.btrim(p_feedback);
begin
  if v_actor is null or not exists (
    select 1 from public.profiles
    where id = v_actor and role = 'admin'
  ) then
    raise exception 'Admin authorization is required' using errcode = '42501';
  end if;

  if p_submission_id is null or p_decision is null
     or p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision' using errcode = '22023';
  end if;
  if p_decision = 'rejected'
     and (v_feedback is null or pg_catalog.char_length(v_feedback) = 0
          or pg_catalog.char_length(v_feedback) > 2000) then
    raise exception 'Rejection feedback must contain 1 to 2000 characters' using errcode = '22023';
  end if;
  if p_decision = 'approved' and p_feedback is not null then
    raise exception 'Approval must not include rejection feedback' using errcode = '22023';
  end if;

  update public.property_submissions
  set status = p_decision,
      rejection_feedback = case when p_decision = 'rejected' then v_feedback else null end,
      reviewed_by = v_actor,
      reviewed_at = pg_catalog.now()
  where id = p_submission_id and status = 'pending'
    and published_property_id is null;

  if not found then
    raise exception 'Submission not found or already reviewed' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.review_property_submission(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.review_property_submission(uuid, text, text)
  to authenticated;

commit;
