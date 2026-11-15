-- REVIEW ONLY. Requires 0009, 0010, 0011 and 0013. Do not execute before
-- independent security review and isolated Supabase integration testing.
-- Only trusted server code may call these functions; p_actor is NOT authenticated
-- by PostgreSQL and must be obtained from auth.getUser() by that server.
begin;

create table public.property_submission_attempts (
  id uuid primary key,
  user_id uuid not null references public.profiles(id),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'array'
    and jsonb_array_length(manifest) between 1 and 5),
  state text not null default 'staging' check (state in ('staging', 'committed', 'cleaning', 'cleaned')),
  created_at timestamptz not null default now(),
  last_checked_at timestamptz
);
alter table public.property_submission_attempts enable row level security;
revoke all on public.property_submission_attempts from public, anon, authenticated;

create function public.begin_private_submission(p_id uuid, p_actor uuid, p_fingerprint text, p_payload jsonb, p_manifest jsonb)
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
     or not public.property_submission_details_valid(p_payload->'details') then
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

create function public.commit_private_submission(p_id uuid, p_actor uuid, p_fingerprint text)
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
     or not exists (select 1 from public.profiles where id=p_actor and role='customer') then
    raise exception 'Submission attempt expired' using errcode = 'P0001';
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
  insert into public.property_submissions(id,user_id,title,category,locality,address,price,area,description,details,photo_paths)
  values(p_id,p_actor,v_attempt.payload->>'title',v_attempt.payload->>'category',
    v_attempt.payload->>'locality',v_attempt.payload->>'address',
    (v_attempt.payload->>'price')::numeric,(v_attempt.payload->>'area')::numeric,
    v_attempt.payload->>'description',v_attempt.payload->'details',v_paths);
  update public.property_submission_attempts set state='committed' where id=p_id;
  return p_id;
end;
$$;

-- A cleanup claim irrevocably prevents commit. Revisit cleaned tombstones:
-- an in-flight Storage upload can finish after a cleanup pass.
create function public.claim_private_submission_cleanup(p_limit integer)
returns table(id uuid, user_id uuid, manifest jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then raise exception 'Invalid limit'; end if;
  return query
  with candidates as (
    select a.id from public.property_submission_attempts a
    where ((a.state='staging' and a.created_at < pg_catalog.now() - interval '24 hours')
      or (a.state in ('cleaning','cleaned') and (a.last_checked_at is null or a.last_checked_at < pg_catalog.now() - interval '1 hour')))
      and not exists (
        select 1 from public.property_submissions s
        where s.id=a.id or s.photo_paths && array(
          select item->>'path' from pg_catalog.jsonb_array_elements(a.manifest) item
        )
      )
    order by a.last_checked_at nulls first, a.created_at
    for update skip locked limit p_limit
  )
  update public.property_submission_attempts a set state='cleaning', last_checked_at=pg_catalog.now()
  from candidates c where a.id=c.id
  returning a.id,a.user_id,a.manifest;
end;
$$;

create function public.finish_private_submission_cleanup(p_id uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.property_submission_attempts a set state='cleaned',last_checked_at=pg_catalog.now()
  where a.id=p_id and a.user_id=p_actor and a.state='cleaning'
    and not exists (
      select 1 from public.property_submissions s
      where s.id=a.id or s.photo_paths && array(
        select item->>'path' from pg_catalog.jsonb_array_elements(a.manifest) item
      )
    );
  if not found then raise exception 'Cleanup attempt unavailable' using errcode='P0001'; end if;
end;
$$;

revoke all on function public.begin_private_submission(uuid,uuid,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.commit_private_submission(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.claim_private_submission_cleanup(integer) from public, anon, authenticated;
revoke all on function public.finish_private_submission_cleanup(uuid,uuid) from public, anon, authenticated;
grant execute on function public.begin_private_submission(uuid,uuid,text,jsonb,jsonb) to service_role;
grant execute on function public.commit_private_submission(uuid,uuid,text) to service_role;
grant execute on function public.claim_private_submission_cleanup(integer) to service_role;
grant execute on function public.finish_private_submission_cleanup(uuid,uuid) to service_role;
commit;
