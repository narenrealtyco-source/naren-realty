-- Admin-only deletion for rejected property records.
-- Linked approved submissions and their private photos are preserved.
begin;

alter table public.properties
  drop constraint if exists properties_status_check;
alter table public.properties
  add constraint properties_status_check
  check (status in ('pending', 'approved', 'rejected', 'deleting'));

create or replace function private.claim_rejected_property_deletion(p_property_id uuid)
returns table(property_id uuid, owner_id uuid, storage_paths text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_property public.properties%rowtype;
  v_photo text;
  v_parts text[];
  v_source_path text;
  v_storage_paths text[] := array[]::text[];
  v_count integer;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'admin'
  ) then
    raise exception 'Admin authorization is required' using errcode = '42501';
  end if;

  select * into v_property
  from public.properties
  where id = p_property_id
  for update;

  if not found then
    raise exception 'Property not found' using errcode = 'P0001';
  end if;

  if v_property.status not in ('rejected', 'deleting') then
    raise exception 'Only rejected properties can be deleted' using errcode = 'P0001';
  end if;

  if v_property.photos is null or pg_catalog.jsonb_typeof(v_property.photos) <> 'array' then
    raise exception 'Property photo manifest is invalid' using errcode = '22023';
  end if;

  if pg_catalog.jsonb_array_length(v_property.photos) > 5
     or exists (
       select 1 from pg_catalog.jsonb_array_elements(v_property.photos) as items(item)
       where pg_catalog.jsonb_typeof(item) <> 'string'
     )
     or (
       select pg_catalog.count(*) <> pg_catalog.count(distinct value)
       from pg_catalog.jsonb_array_elements_text(v_property.photos) as photos(value)
     ) then
    raise exception 'Property photo manifest is invalid' using errcode = '22023';
  end if;

  for v_photo in
    select value from pg_catalog.jsonb_array_elements_text(v_property.photos) as photos(value)
  loop
    if v_photo like 'private-submission/%' then
      v_parts := pg_catalog.string_to_array(v_photo, '/');
      if pg_catalog.array_length(v_parts, 1) <> 4
         or v_parts[1] <> 'private-submission'
         or v_parts[2] <> v_property.owner_id::text
         or v_parts[3] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         or v_parts[4] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'Linked submission photo path is invalid' using errcode = '22023';
      end if;
      v_source_path := v_parts[2] || '/' || v_parts[3] || '/' || v_parts[4];
      select pg_catalog.count(*) into v_count
      from public.property_submissions s
      where s.id = v_parts[3]::uuid
        and s.user_id = v_property.owner_id
        and s.status = 'approved'
        and s.published_property_id = v_property.id
        and s.photo_paths @> array[v_source_path]::text[];
      if v_count <> 1 then
        raise exception 'Approved source submission does not match this property; deletion stopped' using errcode = 'P0001';
      end if;
      -- These private files remain attached to the approved customer submission.
    else
      if v_photo !~ ('^' || v_property.owner_id::text || '/' || v_property.id::text ||
        '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
        raise exception 'Property photo path is invalid' using errcode = '22023';
      end if;

      if not exists (
        select 1 from public.properties p
        where p.id <> v_property.id
          and pg_catalog.jsonb_typeof(p.photos) = 'array'
          and p.photos @> pg_catalog.jsonb_build_array(v_photo)
      ) and exists (
        select 1 from storage.objects o
        where o.bucket_id = 'property-photos' and o.name = v_photo
      ) then
        v_storage_paths := pg_catalog.array_append(v_storage_paths, v_photo);
      end if;
    end if;
  end loop;

  if v_property.status = 'rejected' then
    update public.properties set status = 'deleting' where id = v_property.id;
  end if;

  return query select v_property.id, v_property.owner_id, v_storage_paths;
end;
$$;

create or replace function private.finalize_rejected_property_deletion(p_property_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_property public.properties%rowtype;
  v_photo text;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'admin'
  ) then
    raise exception 'Admin authorization is required' using errcode = '42501';
  end if;

  select * into v_property
  from public.properties
  where id = p_property_id
  for update;

  if not found or v_property.status <> 'deleting' then
    raise exception 'Property is not eligible for deletion' using errcode = 'P0001';
  end if;

  for v_photo in
    select value from pg_catalog.jsonb_array_elements_text(v_property.photos) as photos(value)
  loop
    if v_photo ~ ('^' || v_property.owner_id::text || '/' || v_property.id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
      and not exists (
        select 1 from public.properties p
        where p.id <> v_property.id
          and pg_catalog.jsonb_typeof(p.photos) = 'array'
          and p.photos @> pg_catalog.jsonb_build_array(v_photo)
      )
      and exists (
        select 1 from storage.objects o
        where o.bucket_id = 'property-photos' and o.name = v_photo
      ) then
      raise exception 'Some public property photos still exist; retry cleanup' using errcode = 'P0001';
    end if;
  end loop;

  -- Preserve approved submission rows and private photos; only detach the removed listing.
  update public.property_submissions
  set published_property_id = null
  where published_property_id = v_property.id;

  delete from public.properties
  where id = v_property.id and status = 'deleting';

  if not found then
    raise exception 'Property deletion could not be finalized' using errcode = 'P0001';
  end if;
end;
$$;

-- Keep SECURITY DEFINER implementations in the non-exposed private schema.
revoke all on function private.claim_rejected_property_deletion(uuid) from public, anon, service_role;
revoke all on function private.finalize_rejected_property_deletion(uuid) from public, anon, service_role;
grant usage on schema private to authenticated;
grant execute on function private.claim_rejected_property_deletion(uuid) to authenticated;
grant execute on function private.finalize_rejected_property_deletion(uuid) to authenticated;

-- Public PostgREST wrappers are SECURITY INVOKER; authorization is enforced by private functions.
create or replace function public.claim_rejected_property_deletion(p_property_id uuid)
returns table(property_id uuid, owner_id uuid, storage_paths text[])
language sql
security invoker
set search_path = ''
as $
  select * from private.claim_rejected_property_deletion(p_property_id);
$;

create or replace function public.finalize_rejected_property_deletion(p_property_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $
  select private.finalize_rejected_property_deletion(p_property_id);
$;

revoke all on function public.claim_rejected_property_deletion(uuid) from public, anon, service_role;
revoke all on function public.finalize_rejected_property_deletion(uuid) from public, anon, service_role;
grant execute on function public.claim_rejected_property_deletion(uuid) to authenticated;
grant execute on function public.finalize_rejected_property_deletion(uuid) to authenticated;

commit;
