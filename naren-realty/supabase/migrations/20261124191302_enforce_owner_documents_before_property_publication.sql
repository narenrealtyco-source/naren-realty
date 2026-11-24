create or replace function public.approve_and_publish_property_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
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

  select * into v_submission
  from public.property_submissions
  where id = p_submission_id
  for update;

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

  if v_submission.status <> 'pending'
    or v_submission.published_property_id is not null
    or not public.property_submission_details_valid(v_submission.details)
    or not exists (
      select 1 from storage.buckets
      where id = 'private-property-submissions' and public = false
    )
    or not exists (
      select 1 from public.property_submission_documents d
      where d.submission_id = v_submission.id
        and d.user_id = v_submission.user_id
    ) then
    raise exception 'Submission cannot be published: verified ownership / authority documents are required' using errcode = 'P0001';
  end if;

  if pg_catalog.cardinality(v_submission.photo_paths) not between 1 and 5
    or pg_catalog.array_position(v_submission.photo_paths, null) is not null
    or exists (
      select 1 from pg_catalog.unnest(v_submission.photo_paths) as paths(path)
      where path !~ ('^' || v_submission.user_id::text || '/' || v_submission.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
        or not exists (
          select 1 from storage.objects o
          where o.bucket_id = 'private-property-submissions'
            and o.name = path
            and o.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp')
        )
    ) then
    raise exception 'Private submission photos are unavailable' using errcode = 'P0001';
  end if;

  if v_submission.video_path is not null and (
    v_submission.video_path !~ ('^' || v_submission.user_id::text || '/' || v_submission.id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'private-property-submissions'
        and o.name = v_submission.video_path
        and o.metadata->>'mimetype' = 'video/mp4'
        and (o.metadata->>'size')::bigint between 1 and 52428800
    )
  ) then
    raise exception 'Private submission video is unavailable' using errcode = 'P0001';
  end if;

  select pg_catalog.to_jsonb(pg_catalog.array_agg('private-submission/' || path order by position))
  into v_photos
  from pg_catalog.unnest(v_submission.photo_paths) with ordinality as paths(path, position);

  insert into public.properties(owner_id,title,category,locality,price,details,photos,status)
  values (
    v_submission.user_id,
    v_submission.title,
    v_submission.category,
    v_submission.locality,
    v_submission.price,
    pg_catalog.jsonb_build_object(
      'carpetArea', v_submission.area,
      'publicListing', pg_catalog.jsonb_build_object(
        'address', v_submission.address,
        'description', v_submission.description,
        'details', v_submission.details,
        'videoPath', v_submission.video_path
      )
    ),
    v_photos,
    'approved'
  )
  returning id into v_property_id;

  update public.property_submissions
  set status = 'approved',
      reviewed_by = v_actor,
      reviewed_at = pg_catalog.now(),
      rejection_feedback = null,
      published_property_id = v_property_id
  where id = v_submission.id;

  return v_property_id;
end;
$function$;
