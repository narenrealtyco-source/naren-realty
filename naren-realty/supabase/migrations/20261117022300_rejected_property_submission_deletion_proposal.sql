-- REVIEW ONLY. Do not execute until independently reviewed and approved.
-- Adds a retryable deletion lifecycle for rejected, unpublished customer submissions.
begin;

alter table public.property_submissions
  drop constraint if exists property_submissions_status_check;

alter table public.property_submissions
  add constraint property_submissions_status_check
  check (status in ('pending', 'approved', 'rejected', 'deleting'));

create or replace function public.claim_rejected_property_submission_deletion(p_submission_id uuid)
returns table(submission_id uuid, owner_id uuid, photo_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_submission public.property_submissions%rowtype;
  v_path text;
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

  if v_submission.published_property_id is not null
     or v_submission.status not in ('rejected', 'deleting') then
    raise exception 'Only rejected, unpublished submissions can be deleted' using errcode = 'P0001';
  end if;

  if pg_catalog.cardinality(v_submission.photo_paths) not between 1 and 5
     or pg_catalog.array_position(v_submission.photo_paths, null) is not null then
    raise exception 'Submission photo manifest is invalid' using errcode = '22023';
  end if;

  foreach v_path in array v_submission.photo_paths loop
    if v_path !~ ('^' || v_submission.user_id::text || '/' || v_submission.id::text ||
                   '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
      raise exception 'Submission photo path is invalid' using errcode = '22023';
    end if;
  end loop;

  if v_submission.status = 'rejected' then
    update public.property_submissions
    set status = 'deleting'
    where id = v_submission.id and status = 'rejected'
      and published_property_id is null;
  end if;

  return query select v_submission.id, v_submission.user_id, v_submission.photo_paths;
end;
$$;

create or replace function public.finalize_rejected_property_submission_deletion(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_submission public.property_submissions%rowtype;
  v_deleted_id uuid;
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

  if not found or v_submission.status <> 'deleting'
     or v_submission.published_property_id is not null then
    raise exception 'Submission is not eligible for deletion' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'private-property-submissions'
      and o.name = any(v_submission.photo_paths)
  ) then
    raise exception 'Submission photos remain in Storage; retry cleanup' using errcode = 'P0001';
  end if;

  delete from public.property_submissions
  where id = v_submission.id and status = 'deleting'
    and published_property_id is null
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'Submission deletion could not be confirmed' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.claim_rejected_property_submission_deletion(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.finalize_rejected_property_submission_deletion(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_rejected_property_submission_deletion(uuid) to authenticated;
grant execute on function public.finalize_rejected_property_submission_deletion(uuid) to authenticated;

commit;
