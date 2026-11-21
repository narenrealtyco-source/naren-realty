-- REVIEW-ONLY REPLACEMENT PROPOSAL: atomic Customer -> Owner activation.
--
-- This file intentionally lives outside supabase/migrations.
-- Do not deploy 0007 or 0008 before reviewing this proposal.
--
-- Deployment prerequisites:
--   * If naren_owner_activation exists, it must be NOLOGIN, NOSUPERUSER,
--     NOCREATEROLE, NOCREATEDB, NOBYPASSRLS, and must not be reachable by
--     application roles. If absent, the deployment role must have verified
--     CREATEROLE so this transaction can create it with those attributes.
--   * The deployment session must be a verified privileged database role.
-- If any prerequisite is not true, this transaction aborts before changes.

begin;

do $preflight$
declare
  v_owner_oid oid;
  v_owner_name name := 'naren_owner_activation';
  v_deployer_can_create_roles boolean;
  v_handle_owner oid;
  v_service_role_oid oid;
  v_trigger_count integer;
  v_properties_rls boolean;
  v_profiles_rls boolean;
  v_deployer_oid oid;
begin
  select r.rolcreaterole
  into v_deployer_can_create_roles
  from pg_catalog.pg_roles r
  where r.rolname = current_user;

  select r.oid
  into v_deployer_oid
  from pg_catalog.pg_roles r
  where r.rolname = current_user;

  if not coalesce(v_deployer_can_create_roles, false)
     or not has_schema_privilege(current_user, 'public', 'CREATE') then
    raise exception
      'BLOCKED: deployment role lacks supported CREATEROLE or public CREATE privileges';
  end if;

  select r.oid
  into v_owner_oid
  from pg_catalog.pg_roles r
  where r.rolname = v_owner_name
    and not r.rolcanlogin
    and not r.rolsuper
    and not r.rolcreaterole
    and not r.rolcreatedb
    and not r.rolbypassrls
    and not r.rolinherit;

  if v_owner_oid is null
     and exists (
       select 1
       from pg_catalog.pg_roles
       where rolname = v_owner_name
     ) then
    raise exception
      'BLOCKED: dedicated trusted NOLOGIN activation owner is missing or unsafe';
  end if;

  select r.oid
  into v_service_role_oid
  from pg_catalog.pg_roles r
  where r.rolname = 'service_role'
    and r.rolbypassrls;

  if v_service_role_oid is null then
    raise exception 'BLOCKED: service_role with BYPASSRLS is not verified';
  end if;

  if to_regclass('public.profiles') is null
     or to_regclass('public.properties') is null
     or to_regclass('public.enquiries') is null
     or to_regclass('auth.users') is null
     or to_regprocedure('public.handle_new_user()') is null then
    raise exception 'BLOCKED: required existing application objects are missing';
  end if;

  if to_regclass('public.profile_capabilities') is not null
     or to_regclass('public.owner_policy_acceptances') is not null
     or to_regprocedure('public.activate_owner_capability(uuid,text,text,text)') is not null then
    raise exception
      'BLOCKED: activation objects already exist; do not overwrite an unknown deployment';
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
    raise exception 'BLOCKED: profiles schema is not compatible';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name in ('owner_id', 'status')
    group by table_schema, table_name
    having count(*) = 2
  ) then
    raise exception 'BLOCKED: properties ownership/status schema is not compatible';
  end if;

  select c.relrowsecurity
  into v_properties_rls
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'properties'
    and c.relkind in ('r', 'p');

  if not coalesce(v_properties_rls, false) then
    raise exception 'BLOCKED: properties RLS is not enabled';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class c
    where c.oid in ('public.profiles'::regclass, 'public.properties'::regclass)
      and c.relowner = v_deployer_oid
  ) then
    raise exception
      'BLOCKED: deployment role must own profiles and properties to preserve existing policies';
  end if;

  if not exists (
    select 1
    from information_schema.role_table_grants
    where grantee = current_user
      and table_schema = 'auth'
      and table_name = 'users'
      and privilege_type = 'REFERENCES'
      and is_grantable = 'YES'
  ) then
    raise exception
      'BLOCKED: deployment role cannot grant REFERENCES on auth.users';
  end if;

  select c.relrowsecurity
  into v_profiles_rls
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profiles'
    and c.relkind in ('r', 'p');

  if v_profiles_rls
     and exists (
       select 1
       from pg_catalog.pg_policies
       where schemaname = 'public'
         and tablename = 'profiles'
         and policyname in (
           'owner_activation_profiles_insert',
           'owner_activation_profiles_select',
           'owner_activation_profiles_update'
         )
     ) then
    raise exception 'BLOCKED: trusted profiles policies already exist';
  end if;

  select p.proowner
  into v_handle_owner
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

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
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  if v_handle_owner is null or v_trigger_count <> 1 then
    raise exception
      'BLOCKED: auth.users signup trigger binding is not exactly verifiable';
  end if;

  if v_handle_owner <> (
    select oid
    from pg_catalog.pg_roles
    where rolname = current_user
  ) then
    raise exception
      'BLOCKED: deployment role does not own handle_new_user()';
  end if;

  /*
   * Recursive membership checks are deliberately catalog-only and use
   * PostgreSQL 17 membership options. Any login-capable, superuser,
   * CREATEROLE, service_role, anon, or authenticated path into the owner
   * is rejected. The deployment superuser is already trusted by definition.
   */
  if exists (
    with recursive role_paths(member_oid, target_oid, path, set_path, inherit_path) as (
      select
        m.member,
        m.roleid,
        array[m.member, m.roleid]::oid[],
        array[m.set_option]::boolean[],
        array[m.inherit_option]::boolean[]
      from pg_catalog.pg_auth_members m
      union all
      select
        rp.member_oid,
        m.roleid,
        rp.path || m.roleid,
        rp.set_path || m.set_option,
        rp.inherit_path || m.inherit_option
      from role_paths rp
      join pg_catalog.pg_auth_members m on m.member = rp.target_oid
      where not (m.roleid = any(rp.path))
    )
    select 1
    from role_paths rp
    join pg_catalog.pg_roles member_role on member_role.oid = rp.member_oid
    where rp.target_oid = v_owner_oid
      and (
        member_role.oid <> v_owner_oid
        or member_role.rolcanlogin
        or member_role.rolsuper
        or member_role.rolcreaterole
        or member_role.rolname in ('service_role', 'anon', 'authenticated')
      )
  ) then
    raise exception
      'BLOCKED: any recursive role path reaches activation owner';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members m
    where m.member = v_owner_oid
  ) then
    raise exception
      'BLOCKED: activation owner has outbound role memberships';
  end if;

  if exists (
    with recursive role_paths(member_oid, target_oid, path, set_path, inherit_path) as (
      select
        m.member,
        m.roleid,
        array[m.member, m.roleid]::oid[],
        array[m.set_option]::boolean[],
        array[m.inherit_option]::boolean[]
      from pg_catalog.pg_auth_members m
      union all
      select
        rp.member_oid,
        m.roleid,
        rp.path || m.roleid,
        rp.set_path || m.set_option,
        rp.inherit_path || m.inherit_option
      from role_paths rp
      join pg_catalog.pg_auth_members m on m.member = rp.target_oid
      where not (m.roleid = any(rp.path))
    )
    select 1
    from role_paths rp
    join pg_catalog.pg_roles member_role on member_role.oid = rp.member_oid
    where rp.target_oid = v_service_role_oid
      and member_role.rolname not in (
        'authenticator',
        'supabase_storage_admin',
        'postgres',
        'service_role'
      )
  ) then
    raise exception
      'BLOCKED: unexpected application or user role reaches service_role';
  end if;
end;
$preflight$;

do $role_bootstrap$
declare
  v_owner_name name := 'naren_owner_activation';
  v_deployer name := current_user;
begin
  if not exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = v_owner_name
  ) then
    execute format(
      'create role %I noinherit nologin nosuperuser nocreatedb nocreaterole nobypassrls noreplication',
      v_owner_name
    );
  else
    if not exists (
      select 1
      from pg_catalog.pg_roles
      where rolname = v_owner_name
        and not rolcanlogin
        and not rolsuper
        and not rolcreaterole
        and not rolcreatedb
        and not rolbypassrls
        and not rolinherit
    ) then
      raise exception 'BLOCKED: existing activation owner has unsafe attributes';
    end if;
  end if;

  execute format(
    'grant %I to %I with inherit false, set true, admin true',
    v_owner_name,
    v_deployer
  );

  execute format(
    'grant usage, create on schema public to %I',
    v_owner_name
  );

  execute format(
    'grant references on table auth.users to %I',
    v_owner_name
  );
end;
$role_bootstrap$;

-- Future signups always receive a Customer profile. Existing rows are intact.
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

alter function public.handle_new_user() owner to naren_owner_activation;

set local role naren_owner_activation;

create table public.profile_capabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  primary key (user_id, capability),
  constraint profile_capabilities_capability_check
    check (capability = 'owner')
);

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

-- New activation objects are created while the dedicated owner is active.
alter table public.profile_capabilities owner to naren_owner_activation;
alter table public.owner_policy_acceptances owner to naren_owner_activation;

alter table public.profile_capabilities enable row level security;
alter table public.owner_policy_acceptances enable row level security;

reset role;

revoke all on table public.profile_capabilities from public, anon, authenticated;
revoke all on table public.owner_policy_acceptances from public, anon, authenticated;
revoke references on table auth.users from naren_owner_activation;
grant select, insert, update on table public.profiles to naren_owner_activation;

do $profile_policies$
begin
  if exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  ) then
    execute $policy$
      create policy owner_activation_profiles_insert
        on public.profiles
        for insert
        to naren_owner_activation
        with check (true)
    $policy$;

    execute $policy$
      create policy owner_activation_profiles_select
        on public.profiles
        for select
        to naren_owner_activation
        using (true)
    $policy$;

    execute $policy$
      create policy owner_activation_profiles_update
        on public.profiles
        for update
        to naren_owner_activation
        using (role = 'customer')
        with check (role = 'customer')
    $policy$;
  end if;
end;
$profile_policies$;

grant select on table public.profile_capabilities to authenticated;
grant select on table public.owner_policy_acceptances to authenticated;

create policy profile_capabilities_select_own
  on public.profile_capabilities
  for select
  to authenticated
  using (user_id = auth.uid());

create policy owner_policy_acceptances_select_own
  on public.owner_policy_acceptances
  for select
  to authenticated
  using (user_id = auth.uid());

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
    and status = 'pending'
    and exists (
      select 1
      from public.profile_capabilities
      where user_id = auth.uid()
        and capability = 'owner'
    )
  );

set local role naren_owner_activation;

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

reset role;

revoke all on function public.activate_owner_capability(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.activate_owner_capability(uuid, text, text, text)
  to service_role;
revoke create on schema public from naren_owner_activation;

do $role_cleanup$
begin
  execute format(
    'revoke %I from %I',
    'naren_owner_activation',
    current_user
  );
end;
$role_cleanup$;

do $postflight$
declare
  v_owner_oid oid;
  v_activation_owner oid;
  v_handle_owner oid;
  v_service_execute boolean;
  v_capability_rls boolean;
  v_acceptance_rls boolean;
  v_capability_force_rls boolean;
  v_acceptance_force_rls boolean;
begin
  select oid
  into v_owner_oid
  from pg_catalog.pg_roles
  where rolname = 'naren_owner_activation'
    and not rolcanlogin
    and not rolsuper
    and not rolcreaterole
    and not rolcreatedb
    and not rolbypassrls
    and not rolinherit;

  select c.relrowsecurity, c.relforcerowsecurity, c.relowner
  into v_capability_rls, v_capability_force_rls, v_activation_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profile_capabilities';

  select c.relrowsecurity, c.relforcerowsecurity, c.relowner
  into v_acceptance_rls, v_acceptance_force_rls, v_handle_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'owner_policy_acceptances';

  if v_owner_oid is null
     or v_activation_owner <> v_owner_oid
     or v_handle_owner <> v_owner_oid
     or not v_capability_rls
     or not v_acceptance_rls
     or v_capability_force_rls
     or v_acceptance_force_rls then
    raise exception 'BLOCKED: activation ownership or RLS postflight failed';
  end if;

  select p.proowner
  into v_activation_owner
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'activate_owner_capability'
    and pg_catalog.pg_get_function_identity_arguments(p.oid)
      = 'uuid, text, text, text';

  select p.proowner
  into v_handle_owner
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  if v_activation_owner <> v_owner_oid or v_handle_owner <> v_owner_oid then
    raise exception 'BLOCKED: SECURITY DEFINER function ownership failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('handle_new_user', 'activate_owner_capability')
      and p.prosecdef
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
        where cfg = 'search_path=pg_catalog, public'
      )
    group by n.nspname
    having count(*) = 2
  ) then
    raise exception 'BLOCKED: SECURITY DEFINER/search_path postflight failed';
  end if;

  select has_function_privilege(
    'service_role',
    'public.activate_owner_capability(uuid,text,text,text)',
    'EXECUTE'
  )
  into v_service_execute;

  if not v_service_execute
     or has_function_privilege(
          'anon',
          'public.activate_owner_capability(uuid,text,text,text)',
          'EXECUTE'
        )
     or has_function_privilege(
          'authenticated',
          'public.activate_owner_capability(uuid,text,text,text)',
          'EXECUTE'
        )
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

  if not has_table_privilege('naren_owner_activation', 'public.profiles', 'SELECT,INSERT,UPDATE')
     or has_table_privilege('anon', 'public.profile_capabilities', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.profile_capabilities', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('anon', 'public.owner_policy_acceptances', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.owner_policy_acceptances', 'INSERT,UPDATE,DELETE')
     or not exists (
          select 1
          from pg_catalog.pg_class c
          join pg_catalog.pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname = 'properties'
            and c.relkind in ('r', 'p')
            and c.relrowsecurity
        ) then
    raise exception 'BLOCKED: application roles retain activation-table write access';
  end if;

  if exists (
    with recursive role_paths(member_oid, target_oid, path) as (
      select
        m.member,
        m.roleid,
        array[m.member, m.roleid]::oid[]
      from pg_catalog.pg_auth_members m
      union all
      select
        rp.member_oid,
        m.roleid,
        rp.path || m.roleid
      from role_paths rp
      join pg_catalog.pg_auth_members m on m.member = rp.target_oid
      where not (m.roleid = any(rp.path))
    )
    select 1
    from role_paths rp
    join pg_catalog.pg_roles owner_role on owner_role.oid = rp.target_oid
    where owner_role.rolname = 'naren_owner_activation'
  ) then
    raise exception 'BLOCKED: temporary deployment membership was not revoked';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members
    where member = v_owner_oid
  ) then
    raise exception 'BLOCKED: activation owner retains an outbound role membership';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity
  ) and (
    not exists (
      select 1 from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'owner_activation_profiles_insert'
        and cmd = 'INSERT'
    )
    or not exists (
      select 1 from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'owner_activation_profiles_select'
        and cmd = 'SELECT'
    )
    or not exists (
      select 1 from pg_catalog.pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'owner_activation_profiles_update'
        and cmd = 'UPDATE'
    )
  ) then
    raise exception 'BLOCKED: trusted profiles RLS policies are incomplete';
  end if;
end;
$postflight$;

commit;

-- Existing Admin, legacy Owner, property, enquiry, and LocalStorage behavior
-- is not changed by this proposal. No Owner policy is added to enquiries.
