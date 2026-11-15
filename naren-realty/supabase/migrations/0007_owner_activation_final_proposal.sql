-- REVIEW-ONLY PROPOSAL: atomic Customer -> Owner activation.
--
-- Do not execute or deploy this file until the read-only preflight has been
-- reviewed against the target Supabase project. It is intentionally designed
-- to roll back on any inconclusive catalog or privilege check.
--
-- No application secret, database data, or live policy is changed by review.
-- profiles.role remains the compatibility role: Customer activation never
-- changes it from 'customer'. Existing profiles.role = 'owner' policies are
-- preserved for legacy Owners. No enquiries policy is added.

begin;

do $preflight$
declare
  v_owner_oid oid;
  v_owner_name name;
  v_owner_can_login boolean;
  v_owner_is_superuser boolean;
  v_owner_can_create_roles boolean;
  v_owner_bypasses_rls boolean;
  v_profiles_owner oid;
  v_profiles_force_rls boolean;
  v_deployer name := current_user;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('auth.users') is null
     or to_regclass('public.properties') is null
     or to_regprocedure('public.handle_new_user()') is null then
    raise exception 'BLOCKED: required live schema objects are missing';
  end if;

  if to_regclass('public.profile_capabilities') is not null
     or to_regclass('public.owner_policy_acceptances') is not null then
    raise exception 'BLOCKED: proposed activation objects already exist; review current objects before rerun';
  end if;

  if not has_schema_privilege(v_deployer, 'public', 'CREATE') then
    raise exception 'BLOCKED: migration role lacks public CREATE privilege';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = 'service_role'
      and rolbypassrls
  ) then
    raise exception 'BLOCKED: service-role database role with BYPASSRLS is not verified';
  end if;

  select
    p.proowner,
    r.rolname,
    r.rolcanlogin,
    r.rolsuper,
    r.rolcreaterole,
    r.rolbypassrls,
    c.relowner,
    c.relforcerowsecurity
  into
    v_owner_oid,
    v_owner_name,
    v_owner_can_login,
    v_owner_is_superuser,
    v_owner_can_create_roles,
    v_owner_bypasses_rls,
    v_profiles_owner,
    v_profiles_force_rls
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles r on r.oid = p.proowner
  join pg_catalog.pg_class c on c.oid = 'public.profiles'::regclass
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  if v_owner_oid is null
     or v_owner_name = v_deployer
     or v_owner_can_login
     or v_owner_is_superuser
     or v_owner_can_create_roles
     or v_profiles_force_rls
     or (v_profiles_owner <> v_owner_oid and not v_owner_bypasses_rls)
     or not has_table_privilege(v_owner_name, 'public.profiles', 'SELECT,INSERT,UPDATE') then
    raise exception
      'BLOCKED: trusted non-login SECURITY DEFINER owner cannot be verified';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members m
    join pg_catalog.pg_roles member_role on member_role.oid = m.member
    where m.roleid = v_owner_oid
      and (member_role.rolcanlogin or member_role.rolsuper)
  ) then
    raise exception
      'BLOCKED: login-capable or superuser role can inherit/SET ROLE into the SECURITY DEFINER owner';
  end if;

  -- Do not guess policy names. These checks require the existing legacy
  -- policies to retain Owner isolation before additive capability policies
  -- are created.
  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and cmd = 'INSERT'
      and array_to_string(roles, ',') ilike '%authenticated%'
      and coalesce(with_check, '') ilike '%role%'
      and coalesce(with_check, '') ilike '%owner%'
  ) then
    raise exception 'BLOCKED: existing legacy Owner INSERT policy is not verifiable';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and cmd = 'UPDATE'
      and array_to_string(roles, ',') ilike '%authenticated%'
      and coalesce(qual, '') ilike '%owner_id%'
      and coalesce(qual, '') ilike '%pending%'
      and coalesce(qual, '') ilike '%rejected%'
      and coalesce(with_check, '') ilike '%owner_id%'
      and coalesce(with_check, '') ilike '%pending%'
      and coalesce(with_check, '') ilike '%rejected%'
  ) then
    raise exception 'BLOCKED: existing legacy Owner UPDATE isolation policy is not verifiable';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname in (
        'properties_owner_capability_select',
        'properties_owner_capability_insert',
        'properties_owner_capability_update'
      )
  ) then
    raise exception 'BLOCKED: capability property policies already exist';
  end if;
end;
$preflight$;

-- Future Auth signups always create Customer profiles. Existing profiles are
-- untouched, and browser-supplied role metadata is ignored.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.profiles (id, full_name, phone, role, registration_category)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'mobile_number', ''),
    'customer',
    case
      when new.raw_user_meta_data ->> 'registration_category'
        in ('Rental', 'Resale', 'PG', 'Airbnb')
        then new.raw_user_meta_data ->> 'registration_category'
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

create table public.profile_capabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, capability),
  constraint profile_capabilities_capability_check
    check (capability = 'owner')
);

alter table public.profile_capabilities enable row level security;
revoke all on table public.profile_capabilities from anon, authenticated;
grant select on table public.profile_capabilities to authenticated;

create policy profile_capabilities_select_own
  on public.profile_capabilities
  for select
  to authenticated
  using (user_id = auth.uid());

create table public.owner_policy_acceptances (
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_type text not null,
  policy_version text not null,
  registration_category text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, policy_type),
  constraint owner_policy_type_check
    check (policy_type in ('owner_terms', 'pg_hostel_policy', 'airbnb_policy', 'privacy_policy')),
  constraint owner_policy_category_check
    check (registration_category in ('Rental', 'Resale', 'PG', 'Airbnb')),
  constraint owner_policy_version_check
    check (length(btrim(policy_version)) > 0)
);

alter table public.owner_policy_acceptances enable row level security;
revoke all on table public.owner_policy_acceptances from anon, authenticated;
grant select on table public.owner_policy_acceptances to authenticated;

create policy owner_policy_acceptances_select_own
  on public.owner_policy_acceptances
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.activate_owner_capability(
  p_user_id uuid,
  p_registration_category text,
  p_owner_policy_version text,
  p_privacy_policy_version text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_owner_policy_type text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service-role execution is required';
  end if;

  if p_user_id is null
     or p_registration_category is null
     or p_owner_policy_version is null
     or p_privacy_policy_version is null
     or btrim(p_owner_policy_version) = ''
     or btrim(p_privacy_policy_version) = '' then
    raise exception 'Required owner activation values are missing';
  end if;

  if p_registration_category not in ('Rental', 'Resale', 'PG', 'Airbnb') then
    raise exception 'Invalid owner registration category';
  end if;

  v_owner_policy_type := case
    when p_registration_category in ('Rental', 'Resale') then 'owner_terms'
    when p_registration_category = 'PG' then 'pg_hostel_policy'
    when p_registration_category = 'Airbnb' then 'airbnb_policy'
  end;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'customer'
  ) then
    raise exception 'Customer profile is required for owner activation';
  end if;

  insert into public.profile_capabilities (user_id, capability, granted_by)
  values (p_user_id, 'owner', p_user_id)
  on conflict (user_id, capability) do nothing;

  update public.profiles
  set registration_category = p_registration_category
  where id = p_user_id and role = 'customer';

  insert into public.owner_policy_acceptances (
    user_id, policy_type, policy_version, registration_category
  )
  values
    (p_user_id, v_owner_policy_type, p_owner_policy_version, p_registration_category),
    (p_user_id, 'privacy_policy', p_privacy_policy_version, p_registration_category)
  on conflict (user_id, policy_type) do update
    set policy_version = excluded.policy_version,
        registration_category = excluded.registration_category,
        accepted_at = now();
end;
$function$;

-- Transfer the new SECURITY DEFINER function to the already verified owner
-- of handle_new_user(). Abort if the migration role cannot perform the
-- transfer or grant the new owner its table privileges.
do $ownership$
declare
  v_owner_name name;
begin
  select r.rolname
  into v_owner_name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_roles r on r.oid = p.proowner
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  if v_owner_name is null then
    raise exception 'BLOCKED: SECURITY DEFINER owner disappeared during migration';
  end if;

  execute format('alter function public.activate_owner_capability(uuid, text, text, text) owner to %I', v_owner_name);
  execute format('grant select, insert, update on table public.profile_capabilities to %I', v_owner_name);
  execute format('grant select, insert, update on table public.owner_policy_acceptances to %I', v_owner_name);
end;
$ownership$;

revoke all on function public.activate_owner_capability(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.activate_owner_capability(uuid, text, text, text)
  to service_role;

-- Additive capability policies. Existing public-read, Admin, and legacy
-- role-based Owner policies remain untouched.
create policy properties_owner_capability_select
  on public.properties
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profile_capabilities
      where user_id = auth.uid() and capability = 'owner'
    )
  );

create policy properties_owner_capability_insert
  on public.properties
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profile_capabilities
      where user_id = auth.uid() and capability = 'owner'
    )
    and status = 'pending'
  );

create policy properties_owner_capability_update
  on public.properties
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and status in ('pending', 'rejected')
    and exists (
      select 1 from public.profile_capabilities
      where user_id = auth.uid() and capability = 'owner'
    )
  )
  with check (
    owner_id = auth.uid()
    and status in ('pending', 'rejected')
    and exists (
      select 1 from public.profile_capabilities
      where user_id = auth.uid() and capability = 'owner'
    )
  );

commit;

-- Rollback: transaction failure rolls back all new objects. A later rollback
-- must remove only objects introduced here after confirming no active
-- capability depends on them. Existing profiles, legacy Owner properties,
-- enquiries, Admin policies, and LocalStorage data are not deleted.
