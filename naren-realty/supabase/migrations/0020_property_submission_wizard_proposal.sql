-- REVIEW ONLY. Requires 0009, 0011, 0013, 0014 and 0016.
-- Review existing RLS, Storage policies, grants and function ownership before deployment.
begin;

create function public.property_submission_owner_details_valid(p_owner_details jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_name text;
  v_mobile text;
  v_email text;
  v_relationship text;
  v_authorization text;
begin
  if p_owner_details is null or pg_catalog.jsonb_typeof(p_owner_details) <> 'object'
     or pg_catalog.jsonb_object_length(p_owner_details) <> 6
     or (p_owner_details - array['version','fullName','mobile','email','relationship','authorizationDetails']) <> '{}'::jsonb
     or p_owner_details->'version' is distinct from '1'::jsonb
     or pg_catalog.jsonb_typeof(p_owner_details->'fullName') is distinct from 'string'
     or pg_catalog.jsonb_typeof(p_owner_details->'mobile') is distinct from 'string'
     or pg_catalog.jsonb_typeof(p_owner_details->'email') is distinct from 'string'
     or pg_catalog.jsonb_typeof(p_owner_details->'relationship') is distinct from 'string'
     or pg_catalog.jsonb_typeof(p_owner_details->'authorizationDetails') is distinct from 'string' then
    return false;
  end if;
  v_name := pg_catalog.btrim(p_owner_details->>'fullName');
  v_mobile := p_owner_details->>'mobile';
  v_email := p_owner_details->>'email';
  v_relationship := p_owner_details->>'relationship';
  v_authorization := pg_catalog.btrim(p_owner_details->>'authorizationDetails');
  if pg_catalog.char_length(v_name) not between 2 and 120
     or v_mobile !~ '^(\+?91)?[6-9][0-9]{9}$'
     or pg_catalog.char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or v_email <> pg_catalog.lower(v_email)
     or v_relationship not in ('Owner','Power of Attorney','Authorized Representative')
     or pg_catalog.char_length(v_authorization) > 1000
     or (v_relationship <> 'Owner' and pg_catalog.char_length(v_authorization) < 10) then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.property_submission_owner_details_valid(jsonb) from public, anon;
grant execute on function public.property_submission_owner_details_valid(jsonb)
  to authenticated, service_role;

alter table public.property_submissions
  add column owner_details jsonb
    check (owner_details is null or public.property_submission_owner_details_valid(owner_details));

create function public.property_submission_draft_valid(p_payload jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
begin
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object'
     or pg_catalog.jsonb_object_length(p_payload) <> 6
     or (p_payload - array['version','step','category','values','details','ownerDetails']) <> '{}'::jsonb
     or p_payload->'version' is distinct from '1'::jsonb
     or pg_catalog.jsonb_typeof(p_payload->'step') is distinct from 'number'
     or p_payload->>'step' !~ '^[1-7]$'
     or p_payload->>'category' is null or p_payload->>'category' not in ('','Rental','Resale','PG','Airbnb')
     or pg_catalog.jsonb_typeof(p_payload->'values') is distinct from 'object'
     or pg_catalog.jsonb_object_length(p_payload->'values') <> 6
     or (p_payload->'values' - array['title','locality','address','price','area','description']) <> '{}'::jsonb
     or pg_catalog.jsonb_typeof(p_payload->'ownerDetails') is distinct from 'object'
     or pg_catalog.jsonb_object_length(p_payload->'ownerDetails') <> 5
     or (p_payload->'ownerDetails' - array['fullName','mobile','email','relationship','authorizationDetails']) <> '{}'::jsonb
     or not public.property_submission_details_valid(p_payload->'details')
     or pg_catalog.octet_length(p_payload::text) > 40000 then
    return false;
  end if;
  for v_key, v_value in select * from pg_catalog.jsonb_each(p_payload->'values') loop
    if pg_catalog.jsonb_typeof(v_value) is distinct from 'string'
       or pg_catalog.char_length(v_value #>> '{}') > case v_key when 'description' then 2000 else 500 end then
      return false;
    end if;
  end loop;
  for v_key, v_value in select * from pg_catalog.jsonb_each(p_payload->'ownerDetails') loop
    if pg_catalog.jsonb_typeof(v_value) is distinct from 'string'
       or pg_catalog.char_length(v_value #>> '{}') > case v_key when 'email' then 254 when 'authorizationDetails' then 1000 else 120 end then
      return false;
    end if;
  end loop;
  if p_payload->'ownerDetails'->>'relationship' not in ('','Owner','Power of Attorney','Authorized Representative') then
    return false;
  end if;
  return true;
end;
$$;

revoke all on function public.property_submission_draft_valid(jsonb) from public, anon;
grant execute on function public.property_submission_draft_valid(jsonb) to authenticated;

create table public.property_submission_drafts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payload jsonb not null check (public.property_submission_draft_valid(payload)),
  updated_at timestamptz not null default now()
);
alter table public.property_submission_drafts enable row level security;
revoke all on public.property_submission_drafts from public, anon;
grant select, insert, update, delete on public.property_submission_drafts to authenticated;
create policy "Customers manage their own property submission draft"
  on public.property_submission_drafts
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'customer')
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'customer')
  );

create or replace function public.begin_private_submission(
  p_id uuid, p_actor uuid, p_fingerprint text, p_payload jsonb, p_manifest jsonb
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.property_submission_attempts%rowtype;
  v_item jsonb;
  v_path text;
  v_paths text[] := array[]::text[];
begin
  if p_id is null or p_actor is null or not exists (
    select 1 from public.profiles where id = p_actor and role = 'customer'
  ) then raise exception 'Customer authorization required' using errcode = '42501'; end if;
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$'
     or pg_catalog.jsonb_typeof(p_payload) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_manifest) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_manifest) not between 1 and 5
     or not public.property_submission_details_valid(p_payload->'details')
     or not public.property_submission_owner_details_valid(p_payload->'ownerDetails') then
    raise exception 'Invalid submission attempt' using errcode = '22023';
  end if;
  for v_item in select * from pg_catalog.jsonb_array_elements(p_manifest) loop
    v_path := v_item->>'path';
    if pg_catalog.jsonb_typeof(v_item) <> 'object'
       or (v_item - array['path','type','size','digest']) <> '{}'::jsonb
       or v_path is null or v_path !~ ('^' || p_actor::text || '/' || p_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
       or v_item->>'type' is null or v_item->>'type' not in ('image/jpeg','image/png','image/webp')
       or pg_catalog.jsonb_typeof(v_item->'size') is distinct from 'number'
       or (v_item->>'size')::numeric not between 1 and 5242880
       or v_item->>'digest' is null or v_item->>'digest' !~ '^[0-9a-f]{64}$'
       or v_path = any(v_paths) then
      raise exception 'Invalid photo manifest' using errcode = '22023';
    end if;
    v_paths := pg_catalog.array_append(v_paths, v_path);
  end loop;
  insert into public.property_submission_attempts(id,user_id,fingerprint,payload,manifest)
    values(p_id,p_actor,p_fingerprint,p_payload,p_manifest) on conflict (id) do nothing;
  select * into v_attempt from public.property_submission_attempts where id=p_id for update;
  if v_attempt.user_id <> p_actor or v_attempt.fingerprint <> p_fingerprint
     or v_attempt.payload <> p_payload or v_attempt.manifest <> p_manifest then
    raise exception 'Submission attempt conflict' using errcode = '23505';
  end if;
  return v_attempt.state;
end;
$$;

create or replace function public.commit_private_submission(p_id uuid, p_actor uuid, p_fingerprint text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_attempt public.property_submission_attempts%rowtype;
  v_item jsonb;
  v_paths text[] := array[]::text[];
begin
  select * into v_attempt from public.property_submission_attempts where id=p_id for update;
  if not found or p_actor is null or v_attempt.user_id <> p_actor or v_attempt.fingerprint is distinct from p_fingerprint then
    raise exception 'Submission attempt not found' using errcode = '42501';
  end if;
  if v_attempt.state = 'committed' then return p_id; end if;
  if v_attempt.state <> 'staging' or v_attempt.created_at < pg_catalog.now() - interval '24 hours'
     or not exists (select 1 from public.profiles where id=p_actor and role='customer')
     or not public.property_submission_details_valid(v_attempt.payload->'details')
     or not public.property_submission_owner_details_valid(v_attempt.payload->'ownerDetails') then
    raise exception 'Submission attempt expired or invalid' using errcode = 'P0001';
  end if;
  for v_item in select * from pg_catalog.jsonb_array_elements(v_attempt.manifest) loop
    if not exists (
      select 1 from storage.objects o where o.bucket_id='private-property-submissions'
        and o.name=v_item->>'path'
        and o.metadata->>'mimetype'=v_item->>'type'
        and o.metadata->>'size'=v_item->>'size'
    ) then raise exception 'Private photo missing or metadata mismatch' using errcode = 'P0001'; end if;
    v_paths := pg_catalog.array_append(v_paths,v_item->>'path');
  end loop;
  insert into public.property_submissions(
    id,user_id,title,category,locality,address,price,area,description,details,owner_details,photo_paths
  )
  values(
    p_id,p_actor,v_attempt.payload->>'title',v_attempt.payload->>'category',
    v_attempt.payload->>'locality',v_attempt.payload->>'address',
    (v_attempt.payload->>'price')::numeric,(v_attempt.payload->>'area')::numeric,
    v_attempt.payload->>'description',v_attempt.payload->'details',
    v_attempt.payload->'ownerDetails',v_paths
  );
  update public.property_submission_attempts set state='committed' where id=p_id;
  return p_id;
end;
$$;

create function public.resubmit_property_submission_v3(
  p_id uuid, p_title text, p_category text, p_locality text, p_address text,
  p_price numeric, p_area numeric, p_description text, p_details jsonb, p_owner_details jsonb
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
  if p_id is null or p_title is null or pg_catalog.char_length(pg_catalog.btrim(p_title)) not between 1 and 120
     or p_category is null or p_category not in ('Rental','Resale','PG','Airbnb')
     or p_locality is null or pg_catalog.char_length(pg_catalog.btrim(p_locality)) not between 1 and 120
     or p_address is null or pg_catalog.char_length(pg_catalog.btrim(p_address)) not between 1 and 500
     or p_price is null or p_price::text in ('NaN','Infinity','-Infinity')
     or p_price <= 0 or p_price > 1000000000000
     or p_area is null or p_area::text in ('NaN','Infinity','-Infinity')
     or p_area <= 0 or p_area > 10000000
     or p_description is null or pg_catalog.char_length(pg_catalog.btrim(p_description)) not between 1 and 2000
     or not public.property_submission_details_valid(p_details)
     or not public.property_submission_owner_details_valid(p_owner_details) then
    raise exception 'Invalid submission details' using errcode = '22023';
  end if;
  update public.property_submissions
  set title = pg_catalog.btrim(p_title), category = p_category,
      locality = pg_catalog.btrim(p_locality), address = pg_catalog.btrim(p_address),
      price = p_price, area = p_area, description = pg_catalog.btrim(p_description),
      details = p_details, owner_details = p_owner_details, status = 'pending',
      rejection_feedback = null, reviewed_by = null, reviewed_at = null
  where id = p_id and user_id = v_actor and status = 'rejected'
    and published_property_id is null;
  if not found then
    raise exception 'Submission not found or not eligible for resubmission' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.resubmit_property_submission_v3(uuid,text,text,text,text,numeric,numeric,text,jsonb,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.resubmit_property_submission_v3(uuid,text,text,text,text,numeric,numeric,text,jsonb,jsonb)
  to authenticated;

revoke all on function public.begin_private_submission(uuid,uuid,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.commit_private_submission(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.begin_private_submission(uuid,uuid,text,jsonb,jsonb) to service_role;
grant execute on function public.commit_private_submission(uuid,uuid,text) to service_role;

commit;
