-- REVIEW-ONLY PROPOSAL: unified Customer + Owner authentication, v2.
--
-- DO NOT EXECUTE or deploy this file yet.
--
-- Corrections from 0005:
--   * Removed the authenticated self-grant SECURITY DEFINER RPC.
--   * Owner capability grants are server-only service-role writes.
--   * Added explicit NULL registration-category rejection.
--   * Added fail-closed SECURITY DEFINER owner preflight.
--   * Made the proposal transactional and blocked until exact live property
--     policies are reviewed.
--   * Signup provisioning ignores browser role metadata and defaults to
--     customer without changing existing profiles.
--
-- Confirmed live facts:
--   * public.profiles columns include id, full_name, phone, role, created_at,
--     and registration_category.
--   * profile_capabilities does not exist.
--   * public.properties.owner_id is uuid.
--   * auth.users has on_auth_user_created -> public.handle_new_user().
--   * Existing owner INSERT authorization checks profiles.role = 'owner'.
--   * Existing owner UPDATE authorization restricts own pending/rejected rows.
--   * Admin authorization uses profiles.role = 'admin' and is_admin().
--   * Application owner categories are Rental, Resale, PG, and Airbnb.
--
-- This proposal does not migrate, delete, or overwrite LocalStorage records.
-- It does not add Broker access.

begin;

-- ---------------------------------------------------------------------------
-- 0. Fail-closed preflight
-- ---------------------------------------------------------------------------
--
-- The transaction must stop before any DDL if a required live assumption is
-- not verifiable. The exact owner policy names and expressions are deliberately
-- not guessed; the policy section below remains deployment-blocked until the
-- completed diagnostics output is reviewed.
do $preflight$
declare
  v_function_owner oid;
  v_owner_name name;
  v_owner_can_login boolean;
  v_owner_is_superuser boolean;
  v_owner_can_create_roles boolean;
  v_owner_bypasses_rls boolean;
  v_profiles_owner oid;
  v_profiles_force_rls boolean;
  v_trigger_count integer;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('auth.users') is null
     or to_regclass('public.properties') is null then
    raise exception 'BLOCKED: required live tables are missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name in ('id', 'role', 'registration_category')
    having count(*) <> 3
  ) then
    raise exception 'BLOCKED: profiles columns could not be verified';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name in ('id', 'owner_id', 'status')
    having count(*) <> 3
  ) then
    raise exception 'BLOCKED: properties owner/status columns could not be verified';
  end if;

  if to_regprocedure('public.handle_new_user()') is null then
    raise exception 'BLOCKED: public.handle_new_user() is missing';
  end if;

  select count(*)
  into v_trigger_count
  from pg_catalog.pg_trigger t
  where t.tgrelid = 'auth.users'::regclass
    and not t.tgisinternal
    and pg_catalog.pg_get_triggerdef(t.oid) ilike '%handle_new_user%';

  if v_trigger_count <> 1 then
    raise exception
      'BLOCKED: expected exactly one auth.users trigger calling handle_new_user(), found %',
      v_trigger_count;
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
    v_function_owner,
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

  if v_function_owner is null
     or v_owner_can_login
     or v_owner_is_superuser
     or v_owner_can_create_roles
     or v_profiles_force_rls
     or (v_profiles_owner <> v_function_owner and not v_owner_bypasses_rls)
     or not has_table_privilege(v_owner_name, 'public.profiles', 'INSERT') then
    raise exception
      'BLOCKED: handle_new_user() owner is not verified for safe profile INSERT';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_admin', 'is_naren_admin')
      and p.prosecdef
      and p.proconfig is null
  ) then
    raise exception
      'BLOCKED: relevant SECURITY DEFINER function has no fixed search_path';
  end if;

  -- The live policy names and complete expressions were not supplied. This
  -- explicit stop prevents a partial deployment that creates capabilities but
  -- leaves incompatible role-only Owner policies in place.
  raise exception
    'BLOCKED: review exact live properties Owner SELECT/INSERT/UPDATE policies before deployment';
end;
$preflight$;

-- ---------------------------------------------------------------------------
-- 1. Additive capability schema
-- ---------------------------------------------------------------------------
--
-- This section is intentionally unreachable until the preflight blocker is
-- resolved. It is included to document the atomic deployment shape.
create table public.profile_capabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, capability),
  constraint profile_capabilities_capability_check
    check (capability in ('customer', 'owner'))
);

create index profile_capabilities_capability_idx
  on public.profile_capabilities (capability, user_id);

alter table public.profile_capabilities enable row level security;

revoke all on table public.profile_capabilities from anon, authenticated;
grant select on table public.profile_capabilities to authenticated;

create policy profile_capabilities_select_own
  on public.profile_capabilities
  for select
  to authenticated
  using (user_id = auth.uid());

-- There are intentionally no authenticated INSERT, UPDATE, or DELETE
-- policies. The Next.js server action uses a server-only service-role client
-- after verifying the SSR Auth session. The service-role key must never be
-- present in browser bundles or sent to the client.

-- ---------------------------------------------------------------------------
-- 2. Safe future Auth signup provisioning
-- ---------------------------------------------------------------------------
--
-- Existing profiles are not changed. Future Auth signups always default to
-- customer. raw_user_meta_data.role is intentionally ignored.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_full_name text;
  v_phone text;
  v_category text;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_phone := coalesce(new.raw_user_meta_data ->> 'mobile_number', '');
  v_category := new.raw_user_meta_data ->> 'registration_category';

  insert into public.profiles (
    id,
    full_name,
    phone,
    role,
    registration_category
  )
  values (
    new.id,
    v_full_name,
    v_phone,
    'customer',
    case
      when v_category in ('Rental', 'Resale', 'PG', 'Airbnb')
        then v_category
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- The preflight verified the existing function owner before replacement.
-- Re-check the owner and EXECUTE ACL after replacement. Do not grant this
-- trigger function to anon or authenticated.

-- ---------------------------------------------------------------------------
-- 3. Server-only Owner activation contract
-- ---------------------------------------------------------------------------
--
-- No SQL RPC is created for activation.
--
-- Required Next.js server action:
--   1. Use createSupabaseServerClient() and auth.getUser().
--   2. Reject missing/invalid Auth sessions.
--   3. Derive userId exclusively from the verified user.id.
--   4. Validate registration_category against:
--        Rental, Resale, PG, Airbnb
--      and reject NULL, empty, whitespace, and all other values.
--   5. Use a server-only service-role Supabase client, created only in a
--      server module, to insert:
--        { user_id: verifiedUser.id, capability: 'owner',
--          granted_by: verifiedUser.id }
--   6. Preserve profiles.role; do not update it to owner.
--   7. Update profiles.registration_category only for the verified user,
--      using the already validated category.
--   8. Never accept user_id, role, capability, or owner_id from the browser.
--
-- The service-role key must never be imported by client components, exposed
-- through NEXT_PUBLIC_* variables, or returned in an action response.

-- ---------------------------------------------------------------------------
-- 4. Properties RLS replacement: deployment-blocked templates
-- ---------------------------------------------------------------------------
--
-- Existing role-only Owner policies must be replaced, not supplemented.
-- The exact live policy names and expressions must be inserted only after
-- diagnostics review. Preserve all existing Admin and public-read policies.
--
-- Required Owner SELECT condition:
--   owner_id = auth.uid()
--   and (
--     exists (
--       select 1 from public.profile_capabilities
--       where user_id = auth.uid() and capability = 'owner'
--     )
--     or exists (
--       select 1 from public.profiles
--       where id = auth.uid() and role = 'owner'
--     )
--   )
--
-- Required Owner INSERT WITH CHECK:
--   owner_id = auth.uid()
--   and the same Owner capability/legacy-owner condition above
--
-- Required Owner UPDATE USING:
--   owner_id = auth.uid()
--   and status in (<verified pending value>, <verified rejected value>)
--   and the same Owner capability/legacy-owner condition above
--
-- Required Owner UPDATE WITH CHECK:
--   owner_id = auth.uid()
--   and status in (<verified pending value>, <verified rejected value>)
--   and the same Owner capability/legacy-owner condition above
--
-- The WITH CHECK status restriction is mandatory: it prevents an Owner from
-- changing a pending/rejected property to approved. owner_id = auth.uid()
-- prevents transferring ownership. Do not add any Owner policy on enquiries.
--
-- BLOCKED until exact live policy names, status values, and expressions are
-- reviewed. Do not use guessed DROP POLICY or CREATE POLICY statements.

-- ---------------------------------------------------------------------------
-- 5. Atomic deployment and rollback
-- ---------------------------------------------------------------------------
--
-- This transaction intentionally raises the preflight blocker above and
-- cannot commit as written. After all BLOCKED items are resolved, the
-- operator must:
--   * replace the policy templates with exact reviewed policy operations;
--   * re-run the diagnostics and SECURITY DEFINER owner checks;
--   * test signup, customer activation, owner isolation, and Admin access;
--   * commit only after all checks pass.
--
-- If any later statement fails, roll back the entire transaction. Do not
-- manually continue after a failed DDL statement. Rollback must not delete
-- existing profiles, owner properties, or LocalStorage records.
--
-- Broker access remains disabled.
