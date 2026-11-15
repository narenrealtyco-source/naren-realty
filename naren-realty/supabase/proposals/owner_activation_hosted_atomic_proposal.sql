-- REVIEW-ONLY PROPOSAL: hosted-Supabase Customer -> Owner capability activation.
--
-- Do not execute this file until the read-only preflight and the checklist
-- have been reviewed by the database owner. Migrations 0007 and 0008 must
-- remain undeployed.
--
-- This proposal deliberately does not create roles, grant memberships,
-- transfer ownership, require superuser privileges, or change LocalStorage.
-- New objects are owned by the already verified deployment role.

begin;

create temporary table owner_activation_preflight_policies
on commit drop
as
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'properties', 'enquiries');

do $preflight$
declare
  v_deployer name := current_user;
  v_deployer_oid oid;
  v_handle_owner oid;
  v_profiles_owner oid;
  v_properties_owner oid;
  v_profile_rls boolean;
  v_properties_rls boolean;
  v_enquiries_rls boolean;
  v_trigger_count integer;
  v_unexpected_auth_trigger boolean;
begin
  select oid
  into v_deployer_oid
  from pg_catalog.pg_roles
  where rolname = v_deployer;

  if v_deployer_oid is null
     or v_deployer in ('anon', 'authenticated', 'service_role')
     or not has_schema_privilege(v_deployer, 'public', 'CREATE') then
    raise exception
      'BLOCKED: deployment role is not a trusted schema owner with CREATE';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_roles
    where oid = v_deployer_oid
      and rolsuper
  ) then
    raise exception
      'BLOCKED: hosted deployment must not depend on superuser privileges';
  end if;

  if to_regclass('public.profiles') is null
     or to_regclass('public.properties') is null
     or to_regclass('public.enquiries') is null
     or to_regclass('auth.users') is null
     or to_regprocedure('public.handle_new_user()') is null then
    raise exception 'BLOCKED: required live objects are missing';
  end if;

  select c.relowner, c.relrowsecurity
  into v_profiles_owner, v_profile_rls
  from pg_catalog.pg_class c
  where c.oid = 'public.profiles'::regclass;

  select c.relowner, c.relrowsecurity
  into v_properties_owner, v_properties_rls
  from pg_catalog.pg_class c
  where c.oid = 'public.properties'::regclass;

  select c.relrowsecurity
  into v_enquiries_rls
  from pg_catalog.pg_class c
  where c.oid = 'public.enquiries'::regclass;

  if v_profiles_owner <> v_deployer_oid
     or v_properties_owner <> v_deployer_oid
     or not coalesce(v_profile_rls, false)
     or not coalesce(v_properties_rls, false)
     or not coalesce(v_enquiries_rls, false) then
    raise exception
      'BLOCKED: deployment role ownership or required RLS state is not verified';
  end if;

  select p.proowner
  into v_handle_owner
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  if v_handle_owner <> v_deployer_oid then
    raise exception
      'BLOCKED: deployment role does not own public.handle_new_user()';
  end if;

  if exists (
    with role_access as (
      select
        source_role.oid as source_oid,
        target_role.oid as target_oid,
        pg_catalog.pg_has_role(
          source_role.rolname,
          target_role.rolname,
          'SET'
        ) as can_set,
        pg_catalog.pg_has_role(
          source_role.rolname,
          target_role.rolname,
          'USAGE'
        ) as can_use
      from pg_catalog.pg_roles source_role
      cross join pg_catalog.pg_roles target_role
    )
    select 1
    from role_access
    where target_oid = v_deployer_oid
      and source_oid <> v_deployer_oid
      and (can_set or can_use)
  )
  or exists (
    select 1
    from pg_catalog.pg_roles superuser_role
    where superuser_role.rolsuper
      and superuser_role.oid <> v_deployer_oid
  ) then
    raise exception
      'BLOCKED: an application-accessible role or untrusted superuser can reach the trusted object owner';
  end if;

  select count(*)
  into v_trigger_count
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_proc p on p.oid = t.tgfoid
  join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
    and n.nspname = 'auth'
    and c.relname = 'users'
    and pn.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
    and t.tgenabled = 'O'
    and t.tgtype = 5
    and pg_catalog.pg_get_triggerdef(t.oid, true) =
      format(
        'CREATE TRIGGER %I AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
        t.tgname
      );

  select exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal
      and n.nspname = 'auth'
      and c.relname = 'users'
      and pn.nspname = 'public'
      and p.proname = 'handle_new_user'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      and pg_catalog.pg_get_triggerdef(t.oid, true) <>
        format(
          'CREATE TRIGGER %I AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
          t.tgname
        )
  )
  into v_unexpected_auth_trigger;

  if v_trigger_count <> 1 or v_unexpected_auth_trigger then
    raise exception
      'BLOCKED: auth.users must have exactly one public.handle_new_user() trigger';
  end if;

  if to_regclass('public.profile_capabilities') is not null
     or to_regclass('public.owner_policy_acceptances') is not null
     or to_regprocedure('public.activate_owner_capability(uuid,text,text,text)') is not null then
    raise exception
      'BLOCKED: activation objects already exist; do not overwrite them';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name in ('id', 'role', 'registration_category')
    group by table_schema, table_name
    having count(*) = 3
  ) then
    raise exception 'BLOCKED: required profiles columns are not verified';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name in ('id', 'owner_id', 'status')
    group by table_schema, table_name
    having count(*) = 3
  ) then
    raise exception 'BLOCKED: required properties columns are not verified';
  end if;

  if exists (
    select 1
    from public.properties
    where lower(status) not in ('pending', 'rejected', 'approved')
  ) then
    raise exception
      'BLOCKED: properties contains an unverified status value';
  end if;

  if exists (
    select 1
    from owner_activation_preflight_policies
    where permissive = 'PERMISSIVE'
      and roles && array['public', 'anon', 'authenticated']::name[]
  ) then
    raise exception
      'BLOCKED: complete semantic review of every public/application RLS policy is required before deployment; permissive OR behavior is not inferred';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
    where t.tgrelid = 'public.profiles'::regclass
      and t.tgname = 'profiles_protect_role_v4'
      and not t.tgisinternal
      and t.tgenabled = 'O'
      and (t.tgtype & 1) = 1
      and (t.tgtype & 2) = 2
      and (t.tgtype & 4) = 4
      and (t.tgtype & 16) = 16
      and (t.tgtype & 8) = 0
      and (t.tgtype & 32) = 0
      and (t.tgtype & 64) = 0
      and n.nspname = 'public'
      and pn.nspname = 'public'
      and p.proname = 'protect_profile_role_v4'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      and pg_catalog.pg_get_triggerdef(t.oid, true) =
        format(
          'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_v4()',
          t.tgname
        )
      and p.prosecdef
      and (
        select count(*)
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
        where split_part(setting, '=', 1) = 'search_path'
      ) = 1
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
        where split_part(setting, '=', 1) = 'search_path'
          and substring(
            setting
            from char_length('search_path=') + 1
          ) = ''
      )
      and pg_catalog.md5(p.prosrc) = '471e7d2d16d78a93c1712bc1523bb3e1'
  ) then
    raise exception
      'BLOCKED: exact enabled profiles_protect_role_v4 protection is not verified';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_admin'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      and p.prosecdef
      and (
        (
          select count(*)
          from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
          where split_part(setting, '=', 1) = 'search_path'
        ) <> 1
        or not exists (
          select 1
          from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
          where split_part(setting, '=', 1) = 'search_path'
            and substring(
              setting
              from char_length('search_path=') + 1
            ) = ''
        )
      )
  ) then
    raise exception
      'BLOCKED: existing public.is_admin() SECURITY DEFINER configuration is not verified';
  end if;
end;
$preflight$;

-- Future signups always create Customer profiles. Existing rows are untouched.
-- Browser metadata cannot select owner or admin status.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  insert into public.profiles (
    id,
    full_name,
    phone,
    role,
    registration_category
  )
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

create index profile_capabilities_capability_idx
  on public.profile_capabilities (capability, user_id);

alter table public.profile_capabilities enable row level security;
revoke all on table public.profile_capabilities from public, anon, authenticated;
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
    check (policy_type in (
      'owner_terms',
      'pg_hostel_policy',
      'airbnb_policy',
      'privacy_policy'
    )),
  constraint owner_policy_category_check
    check (registration_category in ('Rental', 'Resale', 'PG', 'Airbnb')),
  constraint owner_policy_version_check
    check (length(btrim(policy_version)) > 0)
);

alter table public.owner_policy_acceptances enable row level security;
revoke all on table public.owner_policy_acceptances from public, anon, authenticated;
grant select on table public.owner_policy_acceptances to authenticated;

create policy owner_policy_acceptances_select_own
  on public.owner_policy_acceptances
  for select
  to authenticated
  using (user_id = auth.uid());

create function public.activate_owner_capability(
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
  if current_setting('request.jwt.claim.role', true)
       is distinct from 'service_role' then
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
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'customer'
  ) then
    raise exception 'Customer profile is required for owner activation';
  end if;

  insert into public.profile_capabilities (user_id, capability, granted_by)
  values (p_user_id, 'owner', p_user_id)
  on conflict (user_id, capability) do nothing;

  update public.profiles
  set registration_category = p_registration_category
  where id = p_user_id
    and role = 'customer';

  insert into public.owner_policy_acceptances (
    user_id,
    policy_type,
    policy_version,
    registration_category
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

revoke all on function public.activate_owner_capability(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.activate_owner_capability(uuid, text, text, text)
  to service_role;

-- These are additive capability policies. Existing legacy role='owner'
-- policies are not dropped or modified.
create policy properties_owner_capability_select
  on public.properties
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.profile_capabilities
      where user_id = auth.uid()
        and capability = 'owner'
    )
  );

create policy properties_owner_capability_insert
  on public.properties
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and category in ('Rental', 'Resale', 'PG', 'Airbnb')
    and status = 'pending'
    and exists (
      select 1
      from public.profile_capabilities
      where user_id = auth.uid()
        and capability = 'owner'
    )
  );

create policy properties_owner_capability_update
  on public.properties
  for update
  to authenticated
  using (
    owner_id = auth.uid()
    and status in ('pending', 'rejected')
    and exists (
      select 1
      from public.profile_capabilities
      where user_id = auth.uid()
        and capability = 'owner'
    )
  )
  with check (
    owner_id = auth.uid()
    and category in ('Rental', 'Resale', 'PG', 'Airbnb')
    and status = 'pending'
    and exists (
      select 1
      from public.profile_capabilities
      where user_id = auth.uid()
        and capability = 'owner'
    )
  );

do $postflight$
declare
  v_deployer_oid oid;
  v_function_owner oid;
  v_activation_owner oid;
  v_capability_rls boolean;
  v_acceptance_rls boolean;
  v_service_execute boolean;
  v_auth_trigger_count integer;
begin
  select oid into v_deployer_oid
  from pg_catalog.pg_roles
  where rolname = current_user;

  select p.proowner
  into v_function_owner
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'activate_owner_capability'
    and pg_catalog.pg_get_function_identity_arguments(p.oid)
      = 'uuid, text, text, text';

  select c.relowner, c.relrowsecurity
  into v_activation_owner, v_capability_rls
  from pg_catalog.pg_class c
  where c.oid = 'public.profile_capabilities'::regclass;

  select c.relrowsecurity
  into v_acceptance_rls
  from pg_catalog.pg_class c
  where c.oid = 'public.owner_policy_acceptances'::regclass;

  if v_function_owner <> v_deployer_oid
     or v_activation_owner <> v_deployer_oid
     or not v_capability_rls
     or not v_acceptance_rls then
    raise exception 'BLOCKED: activation ownership or RLS postflight failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'activate_owner_capability'
      and p.prosecdef
      and (
        select count(*)
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
        where split_part(setting, '=', 1) = 'search_path'
      ) = 1
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
        where setting = 'search_path=pg_catalog, public'
      )
  ) then
    raise exception 'BLOCKED: activation SECURITY DEFINER/search_path failed';
  end if;

  select count(*)
  into v_auth_trigger_count
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_proc p on p.oid = t.tgfoid
  join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
    and n.nspname = 'auth'
    and c.relname = 'users'
    and pn.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
    and t.tgenabled = 'O'
    and t.tgtype = 5
    and pg_catalog.pg_get_triggerdef(t.oid, true) =
      format(
        'CREATE TRIGGER %I AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
        t.tgname
      );

  select exists (
    select 1
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal
      and n.nspname = 'auth'
      and c.relname = 'users'
      and pn.nspname = 'public'
      and p.proname = 'handle_new_user'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      and pg_catalog.pg_get_triggerdef(t.oid, true) <>
        format(
          'CREATE TRIGGER %I AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
          t.tgname
        )
  )
  into v_unexpected_auth_trigger;

  if v_auth_trigger_count <> 1 or v_unexpected_auth_trigger then
    raise exception
      'BLOCKED: exact enabled auth.users AFTER INSERT trigger binding failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
      and p.proowner = v_deployer_oid
      and p.prosecdef
      and (
        select count(*)
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
        where split_part(setting, '=', 1) = 'search_path'
      ) = 1
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) as config(setting)
        where setting = 'search_path=pg_catalog, public'
      )
  ) then
    raise exception
      'BLOCKED: signup trigger function ownership/security configuration failed';
  end if;

  select has_function_privilege(
    'service_role',
    'public.activate_owner_capability(uuid,text,text,text)',
    'EXECUTE'
  )
  into v_service_execute;

  if not v_service_execute
     or exists (
          select 1
          from pg_catalog.pg_proc p
          join pg_catalog.pg_namespace n on n.oid = p.pronamespace
          cross join lateral aclexplode(
            coalesce(p.proacl, acldefault('f', p.proowner))
          ) acl
          where n.nspname = 'public'
            and p.proname = 'activate_owner_capability'
            and pg_catalog.pg_get_function_identity_arguments(p.oid)
              = 'uuid, text, text, text'
            and acl.grantee = 0
            and acl.privilege_type = 'EXECUTE'
        ) then
    raise exception 'BLOCKED: activation EXECUTE ACL is not service_role-only';
  end if;

  if exists (
    with role_access as (
      select
        source_role.oid as source_oid,
        source_role.rolname as source_name,
        target_role.oid as target_oid,
        target_role.rolname as target_name,
        pg_catalog.pg_has_role(
          source_role.rolname,
          target_role.rolname,
          'SET'
        ) as can_set,
        pg_catalog.pg_has_role(
          source_role.rolname,
          target_role.rolname,
          'USAGE'
        ) as can_use
      from pg_catalog.pg_roles source_role
      cross join pg_catalog.pg_roles target_role
    )
    select 1
    from role_access access
    where access.source_oid <> v_deployer_oid
      and access.source_name <> 'service_role'
      and (
        access.source_oid = access.target_oid
        or access.can_set
        or access.can_use
      )
      and has_function_privilege(
        access.target_name,
        'public.activate_owner_capability(uuid,text,text,text)',
        'EXECUTE'
      )
  ) then
    raise exception
      'BLOCKED: a reachable non-service role has effective activation EXECUTE privilege';
  end if;

  if exists (
    with role_access as (
      select
        source_role.oid as source_oid,
        source_role.rolname as source_name,
        target_role.oid as target_oid,
        target_role.rolname as target_name,
        pg_catalog.pg_has_role(
          source_role.rolname,
          target_role.rolname,
          'SET'
        ) as can_set,
        pg_catalog.pg_has_role(
          source_role.rolname,
          target_role.rolname,
          'USAGE'
        ) as can_use
      from pg_catalog.pg_roles source_role
      cross join pg_catalog.pg_roles target_role
    )
    select 1
    from role_access access
    where access.source_oid <> v_deployer_oid
      and access.source_name <> 'service_role'
      and (
        access.source_oid = access.target_oid
        or access.can_set
        or access.can_use
      )
      and (
        has_table_privilege(
          access.target_name,
          'public.profile_capabilities',
          'INSERT'
        )
        or has_table_privilege(
          access.target_name,
          'public.profile_capabilities',
          'UPDATE'
        )
        or has_table_privilege(
          access.target_name,
          'public.profile_capabilities',
          'DELETE'
        )
        or has_table_privilege(
          access.target_name,
          'public.owner_policy_acceptances',
          'INSERT'
        )
        or has_table_privilege(
          access.target_name,
          'public.owner_policy_acceptances',
          'UPDATE'
        )
        or has_table_privilege(
          access.target_name,
          'public.owner_policy_acceptances',
          'DELETE'
        )
      )
  ) then
    raise exception
      'BLOCKED: a reachable non-service role has activation-table write privilege';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname = 'properties_owner_capability_insert'
      and permissive = 'PERMISSIVE'
      and roles = array['authenticated']::name[]
      and cmd = 'INSERT'
      and with_check is not null
  ) then
    raise exception 'BLOCKED: capability INSERT policy metadata postflight failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname = 'properties_owner_capability_update'
      and permissive = 'PERMISSIVE'
      and roles = array['authenticated']::name[]
      and cmd = 'UPDATE'
      and qual is not null
      and with_check is not null
  ) then
    raise exception 'BLOCKED: capability UPDATE policy metadata postflight failed';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'enquiries'
      and policyname like 'owner_activation_%'
  ) then
    raise exception 'BLOCKED: Owner enquiry policy was created';
  end if;
end;
$postflight$;

commit;

-- Rollback guidance:
-- If this transaction fails, PostgreSQL rolls back all proposal changes.
-- Do not manually delete capability or acceptance rows. A post-deployment
-- rollback requires a separately reviewed reverse change preserving legacy
-- policies, Admin access, existing profiles, and LocalStorage.
