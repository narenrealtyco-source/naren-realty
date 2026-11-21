-- REVIEW ONLY. Depends on 0009 and 0010. Do not apply without reviewing
-- effective grants, function ownership, profile role protection, RLS and Storage.
begin;

create function public.resubmit_property_submission(
  p_id uuid, p_title text, p_category text, p_locality text, p_address text,
  p_price numeric, p_area numeric, p_description text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'customer'
  ) then
    raise exception 'Customer authorization is required' using errcode = '42501';
  end if;
  update public.property_submissions
  set title = pg_catalog.btrim(p_title), category = p_category,
      locality = pg_catalog.btrim(p_locality), address = pg_catalog.btrim(p_address),
      price = p_price, area = p_area, description = pg_catalog.btrim(p_description),
      status = 'pending', rejection_feedback = null, reviewed_by = null, reviewed_at = null
  where id = p_id and user_id = v_actor and status = 'rejected'
    and published_property_id is null;
  if not found then
    raise exception 'Submission not found or not eligible for resubmission' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.resubmit_property_submission(uuid, text, text, text, text, numeric, numeric, text)
  from public, anon, authenticated;
grant execute on function public.resubmit_property_submission(uuid, text, text, text, text, numeric, numeric, text)
  to authenticated;
commit;
