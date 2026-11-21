-- REVIEW-ONLY PROPOSAL: repair ownership created by 0007.
--
-- Do not execute or deploy this file until the target catalog has been
-- reviewed. It requires migration 0007 to have completed successfully.
-- It preserves existing tables, functions, grants, RLS, and policies.

begin;

do $preflight$
declare
  v_owner_oid oid;
  v_owner_name name;
  v_owner_can_login boolean;
  v_owner_is_superuser boolean;
  v_owner_can_create_roles boolean;
  v_deployer name := current_user;
  v_service_role_oid oid;
  v_capabilities_owner oid;
  v_acceptances_owner oid;
  v_capabilities_force_rls boolean;
  v_acceptances_force_rls boolean;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('auth.users') is null
     or to_regclass('public.properties') is null
     or to_regclass('public.profile_capabilities') is null
     or to_regclass('public.owner_policy_acceptances') is null
     or to_regprocedure('public.activate_owner_capability(uuid,text,text,text)') is null
     or to_regprocedure('public.handle_new_user()') is null then
    raise exception 'BLOCKED: required 0007 objects are missing';
  end if;

  select
    p.proowner,
    r.rolname,
    r.rolcanlogin,
    r.rolsuper,
    r.rolcreaterole
  into
    v_owner_oid,
    v_owner_name,
    v_owner_can_login,
    v_owner_is_superuser,
    v_owner_can_create_roles
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles r on r.oid = p.proowner
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  if v_owner_oid is null
     or v_owner_can_login
     or v_owner_is_superuser
     or v_owner_can_create_roles then
    raise exception 'BLOCKED: handle_new_user() owner is not a trusted non-login role';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members m
    join pg_catalog.pg_roles member_role on member_role.oid = m.member
    where m.roleid = v_owner_oid
      and (member_role.rolcanlogin or member_role.rolsuper)
  ) then
    raise exception 'BLOCKED: login-capable or superuser role can inherit/SET ROLE into the SECURITY DEFINER owner';
  end if;

  if not has_schema_privilege(v_deployer, 'public', 'CREATE') then
    raise exception 'BLOCKED: migration executor lacks public CREATE privilege';
  end if;

  if not has_table_privilege(v_deployer, 'public.profile_capabilities', 'INSERT,UPDATE,DELETE')
     or not has_table_privilege(v_deployer, 'public.owner_policy_acceptances', 'INSERT,UPDATE,DELETE') then
    raise exception 'BLOCKED: migration executor cannot repair activation-table ownership';
  end if;

  if v_deployer = v_owner_name then
    raise exception 'BLOCKED: migration executor is also the SECURITY DEFINER runtime owner';
  end if;

  select oid
  into v_service_role_oid
  from pg_catalog.pg_roles
  where rolname = 'service_role'
    and rolbypassrls;

  if v_service_role_oid is null then
    raise exception 'BLOCKED: service_role with BYPASSRLS is not verified';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_auth_members m
    join pg_catalog.pg_roles member_role on member_role.oid = m.member
    where m.roleid = v_service_role_oid
      and (member_role.rolcanlogin or member_role.rolsuper)
  ) then
    raise exception 'BLOCKED: login-capable or superuser role inherits service_role';
  end if;

  select c.relowner, c.relforcerowsecurity
  into v_capabilities_owner, v_capabilities_force_rls
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profile_capabilities'
    and c.relkind = 'r';

  select c.relowner, c.relforcerowsecurity
  into v_acceptances_owner, v_acceptances_force_rls
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'owner_policy_acceptances'
    and c.relkind = 'r';

  if v_capabilities_owner is null or v_acceptances_owner is null then
    raise exception 'BLOCKED: required activation tables are not ordinary tables';
  end if;

  if v_capabilities_force_rls or v_acceptances_force_rls then
    raise exception 'BLOCKED: activation table has FORCE ROW LEVEL SECURITY enabled';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'profile_capabilities'
      and policyname = 'profile_capabilities_select_own'
      and cmd = 'SELECT'
  ) then
    raise exception 'BLOCKED: profile_capabilities policy is missing or changed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'owner_policy_acceptances'
      and policyname = 'owner_policy_acceptances_select_own'
      and cmd = 'SELECT'
  ) then
    raise exception 'BLOCKED: owner_policy_acceptances policy is missing or changed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname = 'properties_owner_capability_select'
      and cmd = 'SELECT'
  ) then
    raise exception 'BLOCKED: capability property SELECT policy is missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname = 'properties_owner_capability_insert'
      and cmd = 'INSERT'
  ) then
    raise exception 'BLOCKED: capability property INSERT policy is missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname = 'properties_owner_capability_update'
      and cmd = 'UPDATE'
  ) then
    raise exception 'BLOCKED: capability property UPDATE policy is missing';
  end if;
end;
$preflight$;

do $ownership$
declare
  v_owner_name name;
begin
  select r.rolname
  into v_owner_name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles r on r.oid = p.proowner
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  if v_owner_name is null then
    raise exception 'BLOCKED: trusted SECURITY DEFINER owner disappeared';
  end if;

  execute format('alter table public.profile_capabilities owner to %I', v_owner_name);
  execute format('alter table public.owner_policy_acceptances owner to %I', v_owner_name);

  execute format('grant select, insert, update on table public.profile_capabilities to %I', v_owner_name);
  execute format('grant select, insert, update on table public.owner_policy_acceptances to %I', v_owner_name);
end;
$ownership$;

do $postflight$
declare
  v_owner_oid oid;
  v_owner_name name;
  v_capabilities_owner oid;
  v_acceptances_owner oid;
  v_activation_owner oid;
  v_service_execute boolean;
begin
  select p.proowner, r.rolname
  into v_owner_oid, v_owner_name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles r on r.oid = p.proowner
  where n.nspname = 'public'
    and p.proname = 'handle_new_user'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = '';

  select c.relowner
  into v_capabilities_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'profile_capabilities';

  select c.relowner
  into v_acceptances_owner
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'owner_policy_acceptances';

  if v_capabilities_owner <> v_owner_oid or v_acceptances_owner <> v_owner_oid then
    raise exception 'BLOCKED: activation tables are not owned by the verified runtime owner';
  end if;

  select p.proowner
  into v_activation_owner
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'activate_owner_capability'
    and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'uuid, text, text, text';

  if v_activation_owner <> v_owner_oid then
    raise exception 'BLOCKED: activation function is not owned by the verified runtime owner';
  end if;

  if not has_table_privilege(v_owner_name, 'public.profile_capabilities', 'SELECT,INSERT,UPDATE')
     or not has_table_privilege(v_owner_name, 'public.owner_policy_acceptances', 'SELECT,INSERT,UPDATE') then
    raise exception 'BLOCKED: runtime owner lacks activation-table privileges';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'activate_owner_capability'
      and pg_catalog.pg_get_function_identity_arguments(p.oid) = 'uuid, text, text, text'
      and p.prosecdef
      and exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) cfg
        where cfg = 'search_path=pg_catalog, public'
      )
  ) then
    raise exception 'BLOCKED: activation function SECURITY DEFINER/search_path contract failed';
  end if;

  select has_function_privilege(
    'service_role',
    'public.activate_owner_capability(uuid,text,text,text)',
    'EXECUTE'
  )
  into v_service_execute;

  if not v_service_execute then
    raise exception 'BLOCKED: service_role lacks activation EXECUTE privilege';
  end if;

  if has_function_privilege('public', 'public.activate_owner_capability(uuid,text,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.activate_owner_capability(uuid,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.activate_owner_capability(uuid,text,text,text)', 'EXECUTE') then
    raise exception 'BLOCKED: activation EXECUTE privilege is broader than service_role';
  end if;
end;
$postflight$;

commit;

-- No profiles.role, properties, enquiries, policy, or LocalStorage data is
-- changed by this ownership-repair proposal.
