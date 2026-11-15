-- REVIEW ONLY. Requires 0009, 0010, 0011, 0013 and 0014.
-- Verify existing schema, profile role protection, RLS, function ownership,
-- Storage policies and privileges before any deployment.
begin;

create function public.approve_and_publish_property_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_submission public.property_submissions%rowtype;
  v_property_id uuid;
  v_photos jsonb;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'admin'
  ) then
    raise exception 'Admin authorization is required' using errcode = '42501';
  end if;

  select * into v_submission from public.property_submissions
    where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0001';
  end if;
  if v_submission.status = 'approved' and v_submission.published_property_id is not null then
    if exists (
      select 1 from public.properties
      where id = v_submission.published_property_id and status = 'approved'
    ) then
      return v_submission.published_property_id;
    end if;
    raise exception 'Previously published property is not currently approved' using errcode = 'P0001';
  end if;
  if v_submission.status <> 'pending' or v_submission.published_property_id is not null
     or not public.property_submission_details_valid(v_submission.details)
     or not exists (
       select 1 from storage.buckets
       where id = 'private-property-submissions' and public = false
     ) then
    raise exception 'Submission cannot be published' using errcode = 'P0001';
  end if;
  if pg_catalog.cardinality(v_submission.photo_paths) not between 1 and 5
     or pg_catalog.array_position(v_submission.photo_paths, null) is not null
     or exists (
       select 1 from pg_catalog.unnest(v_submission.photo_paths) as paths(path)
       where path !~ ('^' || v_submission.user_id::text || '/' || v_submission.id::text ||
                      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
          or not exists (
            select 1 from storage.objects o
            where o.bucket_id = 'private-property-submissions' and o.name = path
              and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
          )
     ) then
    raise exception 'Private submission photos are unavailable' using errcode = 'P0001';
  end if;

  select pg_catalog.to_jsonb(pg_catalog.array_agg('private-submission/' || path order by position))
    into v_photos
    from pg_catalog.unnest(v_submission.photo_paths) with ordinality as paths(path, position);
  insert into public.properties (owner_id, title, category, locality, price, details, photos, status)
  values (
    v_submission.user_id, v_submission.title, v_submission.category, v_submission.locality,
    v_submission.price,
    pg_catalog.jsonb_build_object(
      'carpetArea', v_submission.area,
      'publicListing', pg_catalog.jsonb_build_object(
        'address', v_submission.address, 'description', v_submission.description,
        'details', v_submission.details
      )
    ),
    v_photos, 'approved'
  ) returning id into v_property_id;

  update public.property_submissions
  set status = 'approved', reviewed_by = v_actor, reviewed_at = pg_catalog.now(),
      rejection_feedback = null, published_property_id = v_property_id
  where id = v_submission.id;
  return v_property_id;
end;
$$;

revoke all on function public.approve_and_publish_property_submission(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.approve_and_publish_property_submission(uuid) to authenticated;

-- Prevent older clients from recording an approval without publishing it.
create or replace function public.review_property_submission(
  p_submission_id uuid, p_decision text, p_feedback text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_feedback text := pg_catalog.btrim(p_feedback);
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'admin'
  ) then
    raise exception 'Admin authorization is required' using errcode = '42501';
  end if;
  if p_submission_id is null or p_decision is distinct from 'rejected'
     or v_feedback is null or pg_catalog.char_length(v_feedback) not between 1 and 2000 then
    raise exception 'A valid rejection and feedback are required' using errcode = '22023';
  end if;
  update public.property_submissions
  set status = 'rejected', rejection_feedback = v_feedback,
      reviewed_by = v_actor, reviewed_at = pg_catalog.now()
  where id = p_submission_id and status = 'pending' and published_property_id is null;
  if not found then
    raise exception 'Submission not found or already reviewed' using errcode = 'P0001';
  end if;
end;
$$;

commit;
