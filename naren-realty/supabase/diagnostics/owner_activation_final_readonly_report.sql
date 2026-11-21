-- NAREN REALTY: FINAL READ-ONLY OWNER ACTIVATION SECURITY REPORT
--
-- SAFE TO RUN: this file contains one SELECT statement only.
-- It reads PostgreSQL catalogs and privilege metadata. It does not execute
-- application functions, write data, change configuration, change roles,
-- change grants, change policies, or change any database object.
--
-- The report deliberately returns one JSON row for the Supabase SQL Editor.
-- Missing objects are reported as NOT VERIFIED; they are never assumed.
--
-- Migrations 0007 and 0008 must remain undeployed.

with recursive
role_paths(source_oid, current_oid, path, settable, inheritable) as (
  select
    m.member,
    m.roleid,
    array[m.member, m.roleid]::oid[],
    coalesce(m.set_option, true),
    coalesce(m.inherit_option, true)
  from pg_catalog.pg_auth_members m

  union all

  select
    rp.source_oid,
    m.roleid,
    rp.path || m.roleid,
    rp.settable and coalesce(m.set_option, true),
    rp.inheritable and coalesce(m.inherit_option, true)
  from role_paths rp
  join pg_catalog.pg_auth_members m
    on m.member = rp.current_oid
  where not m.roleid = any(rp.path)
),
relevant_roles as (
  select r.*
  from pg_catalog.pg_roles r
),
policy_rows as (
  select
    p.schemaname,
    p.tablename,
    p.policyname,
    p.cmd,
    p.permissive,
    p.roles,
    p.qual,
    p.with_check
  from pg_catalog.pg_policies p
  where p.schemaname = 'public'
    and p.tablename in ('profiles', 'properties', 'enquiries')
),
trigger_rows as (
  select
    t.oid as trigger_oid,
    n.nspname as table_schema,
    c.relname as table_name,
    t.tgname as trigger_name,
    t.tgenabled,
    t.tgtype,
    case
      when (t.tgtype & 2) = 2 then 'BEFORE'
      when (t.tgtype & 64) = 64 then 'INSTEAD OF'
      else 'AFTER'
    end as timing,
    concat_ws(
      ', ',
      case when (t.tgtype & 4) = 4 then 'INSERT' end,
      case when (t.tgtype & 8) = 8 then 'DELETE' end,
      case when (t.tgtype & 16) = 16 then 'UPDATE' end,
      case when (t.tgtype & 32) = 32 then 'TRUNCATE' end
    ) as events,
    pg_catalog.pg_get_triggerdef(t.oid, true) as trigger_definition,
    pn.nspname as function_schema,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as function_arguments,
    pg_catalog.pg_get_functiondef(p.oid) as function_definition,
    owner_role.rolname as function_owner,
    p.prosecdef as function_security_definer,
    p.proconfig as function_configuration,
    (
      select jsonb_agg(
        jsonb_build_object(
          'grantee', coalesce(grantee_role.rolname, 'PUBLIC'),
          'privilege_type', acl.privilege_type,
          'is_grantable', acl.is_grantable
        )
        order by coalesce(grantee_role.rolname, 'PUBLIC'), acl.privilege_type
      )
      from lateral aclexplode(
        coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
      ) acl
      left join pg_catalog.pg_roles grantee_role
        on grantee_role.oid = acl.grantee
    ) as function_acl
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_proc p on p.oid = t.tgfoid
  join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
  join pg_catalog.pg_roles owner_role on owner_role.oid = p.proowner
  where not t.tgisinternal
    and (
      (n.nspname = 'public' and c.relname = 'profiles')
      or (n.nspname = 'auth' and c.relname = 'users')
    )
),
relevant_functions as (
  select
    n.nspname as function_schema,
    p.proname as function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_catalog.pg_get_functiondef(p.oid) as function_definition,
    owner_role.rolname as owner_name,
    p.prosecdef as security_definer,
    p.proconfig as configuration,
    pg_catalog.md5(p.prosrc) as source_md5,
    (
      select jsonb_agg(
        jsonb_build_object(
          'grantee', coalesce(grantee_role.rolname, 'PUBLIC'),
          'privilege_type', acl.privilege_type,
          'is_grantable', acl.is_grantable
        )
        order by coalesce(grantee_role.rolname, 'PUBLIC'), acl.privilege_type
      )
      from lateral aclexplode(
        coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
      ) acl
      left join pg_catalog.pg_roles grantee_role
        on grantee_role.oid = acl.grantee
    ) as function_acl
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles owner_role on owner_role.oid = p.proowner
  where n.nspname = 'public'
    and p.proname in (
      'handle_new_user',
      'protect_profile_role_v4',
      'activate_owner_capability',
      'is_admin'
    )
),
activation_objects as (
  select
    object_name,
    object_kind,
    object_exists,
    owner_name,
    rls_enabled,
    force_rls
  from (
    select
      'profile_capabilities'::text as object_name,
      'table'::text as object_kind,
      c.oid is not null as object_exists,
      owner_role.rolname as owner_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as force_rls
    from (select to_regclass('public.profile_capabilities') as oid) lookup
    left join pg_catalog.pg_class c on c.oid = lookup.oid
    left join pg_catalog.pg_roles owner_role on owner_role.oid = c.relowner

    union all

    select
      'owner_policy_acceptances',
      'table',
      c.oid is not null,
      owner_role.rolname,
      c.relrowsecurity,
      c.relforcerowsecurity
    from (select to_regclass('public.owner_policy_acceptances') as oid) lookup
    left join pg_catalog.pg_class c on c.oid = lookup.oid
    left join pg_catalog.pg_roles owner_role on owner_role.oid = c.relowner

    union all

    select
      'activate_owner_capability(uuid,text,text,text)',
      'function',
      p.oid is not null,
      owner_role.rolname,
      null,
      null
    from (
      select to_regprocedure(
        'public.activate_owner_capability(uuid,text,text,text)'
      ) as oid
    ) lookup
    left join pg_catalog.pg_proc p on p.oid = lookup.oid
    left join pg_catalog.pg_roles owner_role on owner_role.oid = p.proowner
  ) objects
),
role_access_matrix as (
  select
    source_role.oid as source_oid,
    source_role.rolname as source_role,
    target_role.oid as target_oid,
    target_role.rolname as target_role,
    source_role.rolcanlogin as source_can_login,
    source_role.rolsuper as source_is_superuser,
    source_role.rolinherit as source_inherits,
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
),
role_privileges as (
  select
    r.rolname,
    r.oid as role_oid,
    r.rolcanlogin,
    r.rolsuper,
    r.rolinherit,
    r.rolcreaterole,
    r.rolcreatedb,
    r.rolbypassrls,
    r.rolreplication,
    r.rolvaliduntil,
    case
      when to_regprocedure(
        'public.activate_owner_capability(uuid,text,text,text)'
      ) is null then null
      else has_function_privilege(
        r.rolname,
        'public.activate_owner_capability(uuid,text,text,text)',
        'EXECUTE'
      )
    end as activation_execute,
    case
      when to_regclass('public.profile_capabilities') is null then null
      else has_table_privilege(r.rolname, 'public.profile_capabilities', 'SELECT')
    end as capability_select,
    case
      when to_regclass('public.profile_capabilities') is null then null
      else has_table_privilege(r.rolname, 'public.profile_capabilities', 'INSERT')
    end as capability_insert,
    case
      when to_regclass('public.profile_capabilities') is null then null
      else has_table_privilege(r.rolname, 'public.profile_capabilities', 'UPDATE')
    end as capability_update,
    case
      when to_regclass('public.profile_capabilities') is null then null
      else has_table_privilege(r.rolname, 'public.profile_capabilities', 'DELETE')
    end as capability_delete,
    case
      when to_regclass('public.owner_policy_acceptances') is null then null
      else has_table_privilege(r.rolname, 'public.owner_policy_acceptances', 'SELECT')
    end as acceptance_select,
    case
      when to_regclass('public.owner_policy_acceptances') is null then null
      else has_table_privilege(r.rolname, 'public.owner_policy_acceptances', 'INSERT')
    end as acceptance_insert,
    case
      when to_regclass('public.owner_policy_acceptances') is null then null
      else has_table_privilege(r.rolname, 'public.owner_policy_acceptances', 'UPDATE')
    end as acceptance_update,
    case
      when to_regclass('public.owner_policy_acceptances') is null then null
      else has_table_privilege(r.rolname, 'public.owner_policy_acceptances', 'DELETE')
    end as acceptance_delete
  from relevant_roles r
),
role_memberships as (
  select
    source_role.rolname as source_role,
    target_role.rolname as reachable_role,
    rp.settable,
    rp.inheritable,
    rp.path
  from role_paths rp
  join pg_catalog.pg_roles source_role on source_role.oid = rp.source_oid
  join pg_catalog.pg_roles target_role on target_role.oid = rp.current_oid
),
owner_reachability as (
  select
    owner_role.rolname as deployment_owner,
    exists (
      select 1
      from role_access_matrix access
      where access.target_oid = owner_role.oid
        and access.source_oid <> owner_role.oid
        and (access.can_set or access.can_use)
    ) as application_membership_path,
    exists (
      select 1
      from pg_catalog.pg_roles superuser_role
      where superuser_role.rolsuper
        and superuser_role.rolname <> owner_role.rolname
    ) as untrusted_superuser_present
  from pg_catalog.pg_roles owner_role
  where owner_role.oid = (
    select r.oid
    from pg_catalog.pg_roles r
    where r.rolname = current_user
  )
),
trusted_deployment_owner as (
  select
    current_user as owner_name,
    (
      to_regclass('public.profiles') is not null
      and to_regclass('public.properties') is not null
      and to_regprocedure('public.handle_new_user()') is not null
      and exists (
        select 1
        from pg_catalog.pg_class c
        where c.oid in (
          pg_catalog.to_regclass('public.profiles'),
          pg_catalog.to_regclass('public.properties')
        )
        group by c.relowner
        having count(*) = 2
           and pg_catalog.pg_get_userbyid(c.relowner) = current_user
      )
      and exists (
        select 1
        from pg_catalog.pg_proc p
        join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'handle_new_user'
          and pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
          and pg_catalog.pg_get_userbyid(p.proowner) = current_user
      )
      and has_schema_privilege(current_user, 'public', 'CREATE')
      and not exists (
        select 1
        from pg_catalog.pg_roles r
        where r.rolname = current_user
          and r.rolsuper
      )
      and not exists (
        select 1
        from owner_reachability reach
        where reach.application_membership_path
           or reach.untrusted_superuser_present
      )
    ) as is_trusted
),
provider_role_trust as (
  select
    r.oid as role_oid,
    r.rolname,
    (
      r.rolname in (
        'authenticator',
        'supabase_realtime_admin',
        'supabase_storage_admin',
        'supabase_admin'
      )
      and not r.rolcanlogin
      and not r.rolsuper
      and not r.rolcreaterole
      and not r.rolcreatedb
      and not r.rolbypassrls
    ) as is_verified_provider_role,
    case
      when r.rolname in (
        'authenticator',
        'supabase_realtime_admin',
        'supabase_storage_admin',
        'supabase_admin'
      )
       and not r.rolcanlogin
       and not r.rolsuper
       and not r.rolcreaterole
       and not r.rolcreatedb
       and not r.rolbypassrls
        then 'allowlisted Supabase role with restricted catalog attributes'
      when r.rolname in (
        'authenticator',
        'supabase_realtime_admin',
        'supabase_storage_admin',
        'supabase_admin'
      )
        then 'known Supabase role name but provider trust attributes are not verified'
      else 'role is not an allowlisted provider-managed role'
    end as trust_basis
  from pg_catalog.pg_roles r
),
service_role_reachability_base as (
  select
    access.source_oid,
    access.source_role,
    access.target_oid,
    access.target_role,
    access.can_set,
    access.can_use,
    rp.settable,
    rp.inheritable,
    rp.path
  from role_access_matrix access
  left join role_paths rp
    on rp.source_oid = access.source_oid
   and rp.current_oid = access.target_oid
  where access.target_role = 'service_role'
    and access.source_oid <> access.target_oid
    and (access.can_set or access.can_use)
),
service_role_path_roles as (
  select
    reach.source_oid,
    reach.target_oid,
    reach.path,
    path_role.oid as path_role_oid,
    path_role.rolname as path_role,
    path_member.path_position,
    path_role.rolcanlogin,
    path_role.rolsuper,
    path_role.rolcreaterole,
    path_role.rolcreatedb,
    path_role.rolbypassrls,
    coalesce(provider.is_verified_provider_role, false)
      as is_verified_provider_role,
    coalesce(provider.trust_basis, 'role is not an allowlisted provider-managed role')
      as trust_basis
  from service_role_reachability_base reach
  left join lateral unnest(reach.path) with ordinality as path_member(path_oid, path_position)
    on true
  left join pg_catalog.pg_roles path_role
    on path_role.oid = path_member.path_oid
  left join provider_role_trust provider
    on provider.role_oid = path_role.oid
),
service_role_reachability as (
  select
    reach.source_oid,
    reach.source_role,
    reach.target_oid,
    reach.target_role,
    reach.can_set,
    reach.can_use,
    reach.settable,
    reach.inheritable,
    reach.path,
    coalesce(
      bool_and(
        path_roles.path_role_oid = reach.target_oid
        or path_roles.is_verified_provider_role
      ),
      false
    ) as provider_path_verified,
    (
      reach.source_role = current_user
      and cardinality(reach.path) = 2
      and coalesce((select is_trusted from trusted_deployment_owner), false)
    ) as trusted_deployment_owner_path,
    coalesce(
      bool_or(
        path_roles.path_role_oid <> reach.target_oid
        and not path_roles.is_verified_provider_role
        and path_roles.rolcanlogin
        and not (
          path_roles.path_role = current_user
          and cardinality(reach.path) = 2
          and coalesce((select is_trusted from trusted_deployment_owner), false)
        )
      ),
      false
    ) as path_has_established_unauthorized_role,
    jsonb_agg(
      jsonb_build_object(
        'oid', path_roles.path_role_oid,
        'role', path_roles.path_role,
        'position', path_roles.path_position,
        'is_verified_provider_role', path_roles.is_verified_provider_role,
        'trust_basis', path_roles.trust_basis,
        'rolcanlogin', path_roles.rolcanlogin,
        'rolsuper', path_roles.rolsuper,
        'rolcreaterole', path_roles.rolcreaterole,
        'rolcreatedb', path_roles.rolcreatedb,
        'rolbypassrls', path_roles.rolbypassrls
      )
      order by path_roles.path_position
    ) as path_trust_evidence
  from service_role_reachability_base reach
  join service_role_path_roles path_roles
    on path_roles.source_oid = reach.source_oid
   and path_roles.target_oid = reach.target_oid
   and path_roles.path is not distinct from reach.path
  group by
    reach.source_oid,
    reach.source_role,
    reach.target_oid,
    reach.target_role,
    reach.can_set,
    reach.can_use,
    reach.settable,
    reach.inheritable,
    reach.path
),
checks as (
  select jsonb_build_array(
    jsonb_build_object(
      'check', 'deployment_role',
      'status',
      case
        when current_user not in ('anon', 'authenticated', 'service_role')
         and has_schema_privilege(current_user, 'public', 'CREATE')
        then 'PASS'
        else 'FAIL'
      end,
      'evidence', jsonb_build_object(
        'current_user', current_user,
        'current_role_attributes', (
          select to_jsonb(r)
          from relevant_roles r
          where r.rolname = current_user
        )
      )
    ),
    jsonb_build_object(
      'check', 'required_base_objects',
      'status',
      case
        when to_regclass('public.profiles') is not null
         and to_regclass('public.properties') is not null
         and to_regclass('public.enquiries') is not null
         and to_regclass('auth.users') is not null
        then 'PASS'
        else 'NOT VERIFIED'
      end,
      'evidence', jsonb_build_object(
        'profiles', to_regclass('public.profiles') is not null,
        'properties', to_regclass('public.properties') is not null,
        'enquiries', to_regclass('public.enquiries') is not null,
        'auth_users', to_regclass('auth.users') is not null
      )
    ),
    jsonb_build_object(
      'check', 'trusted_deployment_owner',
      'status',
      case
        when coalesce((select is_trusted from trusted_deployment_owner), false)
          then 'PASS'
        else 'NOT VERIFIED'
      end,
      'evidence', coalesce(
        (
          select to_jsonb(trusted_deployment_owner)
          from trusted_deployment_owner
        ),
        '{}'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'deployment_owner_reachability',
      'status',
      case
        when to_regclass('public.profiles') is null
          or not exists (
            select 1
            from owner_reachability
          )
          then 'NOT VERIFIED'
        when not coalesce((select is_trusted from trusted_deployment_owner), false)
          then 'NOT VERIFIED'
        when exists (
          select 1
          from owner_reachability
          where application_membership_path
             or untrusted_superuser_present
        )
          then 'FAIL'
        else 'PASS'
      end,
      'evidence', coalesce(
        (
          select jsonb_agg(to_jsonb(owner_reachability))
          from owner_reachability
        ),
        '[]'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'profiles_role_guard_v4',
      'status',
      case
        when exists (
          select 1
          from trigger_rows t
          join relevant_functions f
            on f.function_schema = t.function_schema
           and f.function_name = t.function_name
           and f.identity_arguments = t.function_arguments
          where t.table_schema = 'public'
            and t.table_name = 'profiles'
            and t.trigger_name = 'profiles_protect_role_v4'
            and t.tgenabled = 'O'
            and (t.tgtype & 1) = 1
            and (t.tgtype & 2) = 2
            and (t.tgtype & 4) = 4
            and (t.tgtype & 16) = 16
            and (t.tgtype & 8) = 0
            and (t.tgtype & 32) = 0
            and (t.tgtype & 64) = 0
            and pg_catalog.pg_get_triggerdef(t.trigger_oid, true) =
              format(
                'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_v4()',
                t.trigger_name
              )
            and t.function_name = 'protect_profile_role_v4'
            and f.security_definer
            and (
              select count(*)
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where split_part(setting, '=', 1) = 'search_path'
            ) = 1
            and exists (
              select 1
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where split_part(setting, '=', 1) = 'search_path'
                and substring(
                  setting
                  from char_length('search_path=') + 1
                ) = ''
            )
            and f.source_md5 = '471e7d2d16d78a93c1712bc1523bb3e1'
        ) then 'PASS'
        else 'NOT VERIFIED'
      end,
      'evidence', coalesce(
        (
          select jsonb_agg(to_jsonb(t))
          from trigger_rows t
          where t.table_schema = 'public'
            and t.table_name = 'profiles'
        ),
        '[]'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'auth_signup_trigger_binding',
      'status',
      case
        when (
          select count(*)
          from trigger_rows t
          where t.table_schema = 'auth'
            and t.table_name = 'users'
            and t.tgenabled = 'O'
            and t.tgtype = 5
            and t.function_schema = 'public'
            and t.function_name = 'handle_new_user'
            and t.function_arguments = ''
            and pg_catalog.pg_get_triggerdef(t.trigger_oid, true) =
              format(
                'CREATE TRIGGER %I AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
                t.trigger_name
              )
            and not exists (
              select 1
              from trigger_rows other
              where other.table_schema = 'auth'
                and other.table_name = 'users'
                and other.function_schema = 'public'
                and other.function_name = 'handle_new_user'
                and other.function_arguments = ''
                and other.trigger_definition <>
                  format(
                    'CREATE TRIGGER %I AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()',
                    other.trigger_name
                  )
            )
        ) = 1 then 'PASS'
        else 'NOT VERIFIED'
      end,
      'evidence', coalesce(
        (
          select jsonb_agg(to_jsonb(t))
          from trigger_rows t
          where t.table_schema = 'auth'
            and t.table_name = 'users'
        ),
        '[]'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'activation_function_security',
      'status',
      case
        when exists (
          select 1
          from relevant_functions f
          where f.function_name = 'activate_owner_capability'
            and f.identity_arguments = 'uuid, text, text, text'
            and f.security_definer
            and (
              select count(*)
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where split_part(setting, '=', 1) = 'search_path'
            ) = 1
            and exists (
              select 1
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where setting = 'search_path=pg_catalog, public'
            )
            and f.owner_name = current_user
        ) then 'PASS'
        else 'NOT VERIFIED'
      end,
      'evidence', coalesce(
        (
          select jsonb_agg(to_jsonb(f))
          from relevant_functions f
          where f.function_name = 'activate_owner_capability'
        ),
        '[]'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'signup_function_security',
      'status',
      case
        when exists (
          select 1
          from relevant_functions f
          where f.function_name = 'handle_new_user'
            and f.identity_arguments = ''
            and f.security_definer
            and (
              select count(*)
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where split_part(setting, '=', 1) = 'search_path'
            ) = 1
            and exists (
              select 1
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where setting = 'search_path=pg_catalog, public'
            )
        ) then 'PASS'
        else 'NOT VERIFIED'
      end,
      'evidence', coalesce(
        (
          select jsonb_agg(to_jsonb(f))
          from relevant_functions f
          where f.function_name = 'handle_new_user'
        ),
        '[]'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'admin_function_security',
      'status',
      case
        when not exists (
          select 1
          from relevant_functions f
          where f.function_name = 'is_admin'
            and f.identity_arguments = ''
        ) then 'NOT VERIFIED'
        when exists (
          select 1
          from relevant_functions f
          where f.function_name = 'is_admin'
            and f.identity_arguments = ''
            and f.security_definer
            and (
              select count(*)
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where split_part(setting, '=', 1) = 'search_path'
            ) = 1
            and exists (
              select 1
              from unnest(coalesce(f.configuration, '{}'::text[])) as config(setting)
              where split_part(setting, '=', 1) = 'search_path'
                and substring(
                  setting
                  from char_length('search_path=') + 1
                ) = ''
            )
        ) then 'PASS'
        else 'NOT VERIFIED'
      end,
      'evidence', coalesce(
        (
          select jsonb_agg(to_jsonb(f))
          from relevant_functions f
          where f.function_name = 'is_admin'
        ),
        '[]'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'service_role_only_effective_execute',
      'status',
      case
        when to_regprocedure(
          'public.activate_owner_capability(uuid,text,text,text)'
        ) is null
          or to_regclass('public.profile_capabilities') is null
          or to_regclass('public.owner_policy_acceptances') is null
          then 'NOT VERIFIED'
        when not exists (
          select 1
          from role_privileges rp
          where rp.rolname = 'service_role'
        ) then 'NOT VERIFIED'
        when not exists (
          select 1
          from role_privileges rp
          where rp.rolname = 'service_role'
            and rp.activation_execute is not null
        ) then 'NOT VERIFIED'
        when exists (
          select 1
          from role_privileges rp
          where rp.rolname = 'service_role'
            and rp.activation_execute is false
        ) then 'FAIL'
        when exists (
          select 1
          from role_privileges rp
          where rp.activation_execute
            and rp.rolname <> 'service_role'
            and not (
              rp.rolname = current_user
              and coalesce((select is_trusted from trusted_deployment_owner), false)
            )
        ) then 'FAIL'
        when exists (
          select 1
          from role_access_matrix access
          join role_privileges target
            on target.role_oid = access.target_oid
          where (access.source_oid = access.target_oid
              or access.can_set
              or access.can_use)
            and target.rolname <> 'service_role'
            and not (
              target.rolname = current_user
              and coalesce((select is_trusted from trusted_deployment_owner), false)
            )
            and (
              target.activation_execute
              or target.capability_insert
              or target.capability_update
              or target.capability_delete
              or target.acceptance_insert
              or target.acceptance_update
              or target.acceptance_delete
            )
        ) then 'FAIL'
        when exists (
          select 1
          from service_role_reachability reach
          where reach.path_has_established_unauthorized_role
        ) then 'FAIL'
        when exists (
          select 1
          from service_role_reachability reach
          where not reach.provider_path_verified
            and not reach.trusted_deployment_owner_path
        ) then 'NOT VERIFIED'
        when not coalesce((select is_trusted from trusted_deployment_owner), false)
          then 'NOT VERIFIED'
        else 'PASS'
      end,
      'evidence', coalesce(
        (
          select jsonb_build_object(
            'service_role', (
              select to_jsonb(service_privileges)
              from role_privileges service_privileges
              where service_privileges.rolname = 'service_role'
            ),
            'all_roles', coalesce(
              (
                select jsonb_agg(to_jsonb(rp))
                from role_privileges rp
              ),
              '[]'::jsonb
            ),
            'service_role_reachability', coalesce(
              (
                select jsonb_agg(
                  to_jsonb(reach)
                  order by reach.source_role, reach.target_role, reach.path
                )
                from service_role_reachability reach
              ),
              '[]'::jsonb
            )
          )
        ),
        '{}'::jsonb
      )
    ),
    jsonb_build_object(
      'check', 'activation_objects',
      'status',
      case
        when exists (
          select 1
          from activation_objects
          where object_name in (
            'profile_capabilities',
            'owner_policy_acceptances',
            'activate_owner_capability(uuid,text,text,text)'
          )
            and object_exists
        ) then 'NOT VERIFIED'
        else 'PASS'
      end,
      'evidence', (
        select coalesce(jsonb_agg(to_jsonb(activation_objects) order by object_name), '[]'::jsonb)
        from activation_objects
      )
    ),
    jsonb_build_object(
      'check', 'activation_atomicity_and_policy_safety',
      'status', 'NOT VERIFIED',
      'evidence', jsonb_build_object(
        'proposal_transaction', 'BEGIN/COMMIT required by local proposal',
        'complete_live_policy_review_required', true,
        'permissive_policy_or_semantics', 'Must be reviewed from complete policy expressions',
        'enquiries_privacy', 'Must be verified from complete live policies',
        'admin_access', 'Must be verified from complete live policies',
        'legacy_owner_access', 'Must be verified from complete live policies'
      )
    )
  ) as checks_json
)
select jsonb_build_object(
  'report', 'NAREN REALTY final read-only Owner activation security diagnostic',
  'read_only', true,
  'generated_by', current_user,
  'postgresql_version', current_setting('server_version'),
  'session', jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'current_role', current_role,
    'current_schema', current_schema()
  ),
  'checks', checks.checks_json,
  'policies', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'schema', policy_rows.schemaname,
          'table', policy_rows.tablename,
          'name', policy_rows.policyname,
          'command', policy_rows.cmd,
          'permissive_or_restrictive', policy_rows.permissive,
          'roles', policy_rows.roles,
          'using', policy_rows.qual,
          'with_check', policy_rows.with_check
        )
        order by policy_rows.tablename, policy_rows.policyname
      )
      from policy_rows
    ),
    '[]'::jsonb
  ),
  'triggers', coalesce(
    (
      select jsonb_agg(
        to_jsonb(trigger_rows)
        order by trigger_rows.table_schema, trigger_rows.table_name, trigger_rows.trigger_name
      )
      from trigger_rows
    ),
    '[]'::jsonb
  ),
  'functions', coalesce(
    (
      select jsonb_agg(
        to_jsonb(relevant_functions)
        order by relevant_functions.function_name
      )
      from relevant_functions
    ),
    '[]'::jsonb
  ),
  'roles', coalesce(
    (
      select jsonb_agg(
        to_jsonb(role_privileges)
        order by role_privileges.rolname
      )
      from role_privileges
    ),
    '[]'::jsonb
  ),
  'role_memberships', coalesce(
    (
      select jsonb_agg(
        to_jsonb(role_memberships)
        order by role_memberships.source_role, role_memberships.reachable_role
      )
      from role_memberships
    ),
    '[]'::jsonb
  ),
  'activation_objects', (
    select coalesce(jsonb_agg(to_jsonb(activation_objects) order by object_name), '[]'::jsonb)
    from activation_objects
  )
) as report
from checks;
