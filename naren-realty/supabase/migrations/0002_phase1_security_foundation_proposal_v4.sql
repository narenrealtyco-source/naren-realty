-- REVIEW-ONLY PROPOSAL: Phase 1 security foundation v4.
-- Do not run until the live profiles/auth.users schema, existing functions,
-- function owners, grants, triggers, and RLS policies have been inspected.
--
-- Repository findings:
--   * app/lib/customers.ts currently creates customer accounts in browser
--     LocalStorage and does not call Supabase Auth.
--   * app/lib/supabase-server.ts reads profiles.role for Admin checks but does
--     not provision profiles.
--   * Repository SQL contains no auth.users signup trigger or profile
--     provisioning function.
--   * The role values used by the existing application include customer,
--     owner, and admin. This proposal uses only customer as the fixed,
--     non-admin signup default; live schema validation is still required.
--
-- This proposal intentionally does not:
--   * enable or disable RLS;
--   * create, replace, or drop existing policies or functions;
--   * modify v1, v2, or v3 proposals;
--   * trust raw_user_meta_data, user_metadata, browser roles, or JWT role
--     claims;
--   * create owner or admin profiles during Auth signup;
--   * change application code or existing data.
--
-- Required live inspection before approval:
--   select
--     table_schema,
--     table_name,
--     column_name,
--     data_type,
--     is_nullable,
--     column_default
--   from information_schema.columns
--   where (table_schema = 'public' and table_name = 'profiles')
--      or (table_schema = 'auth' and table_name = 'users')
--   order by table_schema, table_name, ordinal_position;
--
--   select
--     n.nspname as schema_name,
--     p.proname,
--     pg_get_function_identity_arguments(p.oid) as identity_arguments,
--     pg_get_userbyid(p.proowner) as function_owner,
--     p.prosecdef as security_definer,
--     p.proconfig as configuration,
--     pg_get_functiondef(p.oid) as definition
--   from pg_catalog.pg_proc p
--   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
--   where (n.nspname = 'public' and p.proname in (
--     'protect_profile_role_v3',
--     'protect_profile_role_v4',
--     'provision_customer_profile_v4'
--   ));
--
--   select
--     n.nspname,
--     c.relname,
--     t.tgname,
--     t.tgenabled,
--     pg_catalog.pg_get_triggerdef(t.oid)
--   from pg_catalog.pg_trigger t
--   join pg_catalog.pg_class c on c.oid = t.tgrelid
--   join pg_catalog.pg_namespace n on n.oid = c.relnamespace
--   where not t.tgisinternal
--     and (
--       (n.nspname = 'auth' and c.relname = 'users')
--       or (n.nspname = 'public' and c.relname = 'profiles')
--     );
--
--   select grantee, table_schema, table_name, privilege_type
--   from information_schema.role_table_grants
--   where (table_schema = 'public' and table_name = 'profiles')
--      or (table_schema = 'auth' and table_name = 'users');
--
-- SECURITY DEFINER owner requirements:
--   * Functions must be owned by a trusted, non-login database owner.
--   * The owner must not be writable or alterable by untrusted users.
--   * Confirm ownership, schema privileges, and grants manually.

-- Fail-closed execution-role preflight. The migration execution role may be
-- login-capable, but it is kept separate from the runtime SECURITY DEFINER
-- owner selected from catalog metadata. No role name is assumed.
do $preflight$
declare
  v_role pg_catalog.pg_roles%rowtype;
  v_owner_name name;
  v_owner_count integer;
begin
  select *
  into v_role
  from pg_catalog.pg_roles
  where rolname = current_user;

  if not found
     or v_role.rolreplication
     or v_role.rolbypassrls
     or v_role.rolcreaterole
     or v_role.rolcreatedb then
    raise exception
      'Migration execution role has unsafe database privileges';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_roles login_role
    where login_role.rolcanlogin
      and login_role.oid <> v_role.oid
      and (login_role.rolsuper or login_role.rolcreaterole)
  ) then
    raise exception
      'An untrusted login-capable role can administer database roles';
  end if;

  if pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('auth.users') is null then
    raise exception
      'Required public.profiles and auth.users tables must exist before deployment';
  end if;

  if not has_database_privilege(
    current_user,
    current_database(),
    'TEMP'
  ) then
    raise exception
      'Migration execution role lacks TEMP privilege required for fail-closed owner selection';
  end if;

  if not has_schema_privilege(current_user, 'public', 'USAGE')
     or not has_schema_privilege(current_user, 'public', 'CREATE')
     or not has_schema_privilege(current_user, 'auth', 'USAGE') then
    raise exception
      'Migration execution role lacks required schema privileges';
  end if;

  if not has_table_privilege(current_user, 'public.profiles', 'SELECT')
     or not has_table_privilege(current_user, 'public.profiles', 'INSERT')
     or not has_table_privilege(current_user, 'public.profiles', 'TRIGGER')
     or not has_table_privilege(current_user, 'auth.users', 'SELECT')
     or not has_table_privilege(current_user, 'auth.users', 'TRIGGER') then
    raise exception
      'Migration execution role lacks required table privileges';
  end if;

  if not has_function_privilege(current_user, 'auth.uid()', 'EXECUTE') then
    raise exception
      'Migration execution role lacks EXECUTE on auth.uid()';
  end if;

  create temporary table if not exists naren_v4_owner (
    owner_name name primary key
  );
  truncate table pg_temp.naren_v4_owner;

  with recursive login_reachable(login_oid, role_oid) as (
    select oid, oid
    from pg_catalog.pg_roles
    where rolcanlogin
    union
    select reachable.login_oid, membership.roleid
    from login_reachable reachable
    join pg_catalog.pg_auth_members membership
      on membership.member = reachable.role_oid
  ),
  eligible_owners as (
    select candidate.rolname
    from pg_catalog.pg_roles candidate
    join pg_catalog.pg_class profiles_table
      on profiles_table.oid = 'public.profiles'::pg_catalog.regclass
    join pg_catalog.pg_class auth_users_table
      on auth_users_table.oid = 'auth.users'::pg_catalog.regclass
    where not candidate.rolcanlogin
      and not candidate.rolsuper
      and not candidate.rolreplication
      and not candidate.rolcreaterole
      and not candidate.rolcreatedb
      and candidate.rolinherit
      and not exists (
        select 1
        from login_reachable reachable
        where reachable.role_oid = candidate.oid
          and reachable.login_oid <> v_role.oid
      )
      and pg_has_role(current_user, candidate.rolname, 'SET')
      and has_schema_privilege(candidate.rolname, 'public', 'USAGE')
      and has_schema_privilege(candidate.rolname, 'auth', 'USAGE')
      and has_table_privilege(candidate.rolname, 'public.profiles', 'SELECT')
      and has_table_privilege(candidate.rolname, 'public.profiles', 'INSERT')
      and has_table_privilege(candidate.rolname, 'auth.users', 'SELECT')
      and has_function_privilege(candidate.rolname, 'auth.uid()', 'EXECUTE')
      and (
        (
          pg_catalog.pg_get_userbyid(profiles_table.relowner) = candidate.rolname
          and not profiles_table.relforcerowsecurity
        )
        or candidate.rolbypassrls
      )
      and (
        (
          pg_catalog.pg_get_userbyid(auth_users_table.relowner) = candidate.rolname
          and not auth_users_table.relforcerowsecurity
        )
        or candidate.rolbypassrls
      )
      and candidate.rolname <> current_user;
  )
  select count(*), min(rolname)
  into v_owner_count, v_owner_name
  from eligible_owners;

  if v_owner_count <> 1 then
    raise exception
      'Exactly one trusted distinct SECURITY DEFINER owner must be verifiable; found %',
      v_owner_count;
  end if;

  insert into pg_temp.naren_v4_owner(owner_name)
  values (v_owner_name);
end;
$preflight$;

-- This function provisions only the fixed customer default. It does not read
-- user metadata and is intended to be called only by the auth.users trigger
-- created below. It is not granted to anon, authenticated, or public.
do $proposal$
begin
  if pg_catalog.to_regprocedure('public.provision_customer_profile_v4()') is null then
    execute $function$
      create function public.provision_customer_profile_v4()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $body$
      begin
        if new.id is null then
          raise exception 'Auth user ID is required for profile provisioning';
        end if;

        insert into public.profiles (id, role)
        values (new.id, 'customer');

        return new;
      end;
      $body$
    $function$;

    revoke all on function public.provision_customer_profile_v4() from public;
  else
    raise exception
      'provision_customer_profile_v4() already exists; review its complete definition before deployment';
  end if;

  execute pg_catalog.format(
    'alter function public.provision_customer_profile_v4() owner to %I',
    (select owner_name from pg_temp.naren_v4_owner)
  );
end;
$proposal$;

-- Install the Auth signup trigger only when auth.users exists and no trigger
-- already exists on that table. Existing triggers must be reviewed first to
-- avoid duplicate profile creation or conflicting provisioning behavior.
do $proposal$
begin
  if pg_catalog.to_regclass('auth.users') is null then
    raise notice 'auth.users does not exist; no signup trigger was created.';
  elsif exists (
    select 1
    from pg_catalog.pg_trigger t
    where t.tgrelid = 'auth.users'::pg_catalog.regclass
      and not t.tgisinternal
  ) then
    raise exception
      'Existing auth.users trigger(s) require manual signup-provisioning review';
  else
    execute '
      create trigger auth_users_provision_customer_profile_v4
      after insert on auth.users
      for each row
      execute function public.provision_customer_profile_v4()
    ';
  end if;
end;
$proposal$;

-- Protect both profile creation and role changes:
--   * NULL auth.uid() is accepted only for the nested profile INSERT caused
--     by the trusted auth.users trigger above.
--   * That trusted path accepts only the literal customer default.
--   * Direct service-role, migration, or other NULL-auth profile writes are
--     rejected; they do not receive an implicit bypass.
--   * Authenticated non-admin users may create only their own profile and only
--     with the fixed customer default.
--   * Authenticated admins may create other profiles with existing role values.
--   * Any role UPDATE requires an authenticated admin and cannot target the
--     caller's own profile.
--
-- pg_trigger_depth() distinguishes the nested auth.users -> profiles
-- provisioning operation from a direct profiles INSERT. The auth.users
-- existence check prevents accepting an arbitrary ID from a direct trigger
-- context.
do $proposal$
begin
  if pg_catalog.to_regprocedure('public.protect_profile_role_v4()') is null then
    execute $function$
      create function public.protect_profile_role_v4()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $body$
      declare
        v_is_admin boolean;
        v_is_trusted_signup boolean;
      begin
        v_is_trusted_signup :=
          tg_op = 'INSERT'
          and auth.uid() is null
          and pg_catalog.pg_trigger_depth() = 2
          and new.role is not distinct from 'customer'
          and exists (
            select 1
            from auth.users
            where id = new.id
          );

        if auth.uid() is null and not v_is_trusted_signup then
          raise exception 'Trusted profile provisioning is required';
        end if;

        if v_is_trusted_signup then
          return new;
        end if;

        select exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and role = 'admin'
        )
        into v_is_admin;

        if tg_op = 'INSERT' then
          if not v_is_admin then
            if new.id is distinct from auth.uid() then
              raise exception 'Users may create only their own profile';
            end if;

            if new.role is distinct from 'customer' then
              raise exception 'Users may only create customer profiles';
            end if;
          end if;
        elsif tg_op = 'UPDATE'
          and new.role is distinct from old.role then
          if auth.uid() = old.id then
            raise exception 'Profile roles cannot be changed by the profile owner';
          end if;

          if not v_is_admin then
            raise exception 'Admin authorization is required for profile role changes';
          end if;
        end if;

        return new;
      end;
      $body$
    $function$;

    revoke all on function public.protect_profile_role_v4() from public;
  else
    raise exception
      'protect_profile_role_v4() already exists; review its complete definition before deployment';
  end if;

  execute pg_catalog.format(
    'alter function public.protect_profile_role_v4() owner to %I',
    (select owner_name from pg_temp.naren_v4_owner)
  );
end;
$proposal$;

-- Verify every SECURITY DEFINER owner after guarded creation. Existing
-- functions are rejected above because ownership/configuration checks cannot
-- prove that an unreviewed function body is safe.
do $preflight$
declare
  v_function record;
  v_owner pg_catalog.pg_roles%rowtype;
begin
  for v_function in
    select
      p.oid,
      n.nspname,
      p.proname,
      pg_catalog.pg_get_userbyid(p.proowner) as owner_name,
      p.prosecdef as is_security_definer,
      p.proconfig as function_configuration
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        (p.proname = 'provision_customer_profile_v4'
          and pg_catalog.pg_get_function_identity_arguments(p.oid) = '')
        or (p.proname = 'protect_profile_role_v4'
          and pg_catalog.pg_get_function_identity_arguments(p.oid) = '')
      )
  loop
    if v_function.owner_name is distinct from (
      select owner_name from pg_temp.naren_v4_owner
    ) then
      raise exception
        'public.%() does not use the single verified SECURITY DEFINER owner',
        v_function.proname;
    end if;

    if v_function.is_security_definer is not true
       or coalesce(
         v_function.function_configuration @> array['search_path='],
         false
       ) is not true then
      raise exception
        'public.%() is not SECURITY DEFINER with an empty fixed search_path',
        v_function.proname;
    end if;

    select *
    into v_owner
    from pg_catalog.pg_roles
    where rolname = v_function.owner_name;

    if not found
       or v_owner.rolcanlogin
       or v_owner.rolsuper
       or v_owner.rolreplication
       or v_owner.rolcreaterole
       or v_owner.rolcreatedb
       or v_owner.rolinherit is distinct from true then
      raise exception
        'SECURITY DEFINER owner for public.%() is not a trusted non-login role',
        v_function.proname;
    end if;

    if exists (
      with recursive login_reachable(login_oid, role_oid) as (
        select oid, oid
        from pg_catalog.pg_roles
        where rolcanlogin
        union
        select reachable.login_oid, membership.roleid
        from login_reachable reachable
        join pg_catalog.pg_auth_members membership
          on membership.member = reachable.role_oid
      )
      select 1
      from login_reachable
      where role_oid = v_owner.oid
        and login_oid <> (
          select oid
          from pg_catalog.pg_roles
          where rolname = current_user
        )
    ) then
      raise exception
        'An untrusted login-capable role can SET ROLE to the owner of public.%()',
        v_function.proname;
    end if;

    if not has_schema_privilege(
         v_function.owner_name,
         'public',
         'USAGE'
       )
       or not has_schema_privilege(
         v_function.owner_name,
         'auth',
         'USAGE'
       )
       or not has_table_privilege(
         v_function.owner_name,
         'public.profiles',
         'SELECT'
       )
       or not has_table_privilege(
         v_function.owner_name,
         'auth.users',
         'SELECT'
       )
       or (
         v_function.proname = 'provision_customer_profile_v4'
         and not has_table_privilege(
           v_function.owner_name,
           'public.profiles',
           'INSERT'
         )
       )
       or (
         v_function.proname = 'protect_profile_role_v4'
         and not has_function_privilege(
           v_function.owner_name,
           'auth.uid()',
           'EXECUTE'
         )
       ) then
      raise exception
        'SECURITY DEFINER owner lacks required schema, table, or function privileges';
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_class profiles_table
      where profiles_table.oid = 'public.profiles'::pg_catalog.regclass
        and (
          (
            pg_catalog.pg_get_userbyid(profiles_table.relowner) = v_owner.rolname
            and not profiles_table.relforcerowsecurity
          )
          or v_owner.rolbypassrls
        )
    ) then
      raise exception
        'SECURITY DEFINER owner cannot safely access public.profiles under its RLS configuration';
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_class auth_users_table
      where auth_users_table.oid = 'auth.users'::pg_catalog.regclass
        and (
          (
            pg_catalog.pg_get_userbyid(auth_users_table.relowner) = v_owner.rolname
            and not auth_users_table.relforcerowsecurity
          )
          or v_owner.rolbypassrls
        )
    ) then
      raise exception
        'SECURITY DEFINER owner cannot safely access auth.users under its RLS configuration';
    end if;

    if v_function.proname = 'provision_customer_profile_v4'
       and (
         not has_table_privilege(v_function.owner_name, 'public.profiles', 'INSERT')
         or not has_table_privilege(v_function.owner_name, 'auth.users', 'SELECT')
       ) then
      raise exception
        'Provisioning function owner lacks required table privileges';
    end if;

    if v_function.proname = 'protect_profile_role_v4'
       and (
         not has_table_privilege(v_function.owner_name, 'public.profiles', 'SELECT')
         or not has_table_privilege(v_function.owner_name, 'auth.users', 'SELECT')
       ) then
      raise exception
        'Profile protection function owner lacks required table privileges';
    end if;
  end loop;
end;
$preflight$;

-- Install the profile guard only if profiles has the required columns and
-- neither an earlier proposal trigger nor a conflicting v4 trigger exists.
-- Existing role-protection triggers must be reviewed before this proposal is
-- applied; this block never replaces or disables one.
do $proposal$
begin
  if pg_catalog.to_regclass('public.profiles') is null then
    raise notice 'public.profiles does not exist; no role guard was created.';
  elsif not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    raise notice
      'public.profiles lacks id or role; no role guard was created.';
  elsif exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.profiles'::pg_catalog.regclass
      and tgname in (
        'profiles_prevent_self_role_change_v2',
        'profiles_protect_role_v3'
      )
  ) then
    raise exception
      'An earlier role-protection trigger exists; manual compatibility review is required';
  elsif not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgrelid = 'public.profiles'::pg_catalog.regclass
      and tgname = 'profiles_protect_role_v4'
  ) then
    execute '
      create trigger profiles_protect_role_v4
      before insert or update of role on public.profiles
      for each row
      execute function public.protect_profile_role_v4()
    ';
  else
    if not exists (
      select 1
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_proc p on p.oid = t.tgfoid
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where t.tgrelid = 'public.profiles'::pg_catalog.regclass
        and t.tgname = 'profiles_protect_role_v4'
        and n.nspname = 'public'
        and p.proname = 'protect_profile_role_v4'
    ) then
      raise exception
        'A conflicting profiles_protect_role_v4 trigger already exists';
    end if;
    raise notice
      'profiles_protect_role_v4 already exists with the expected function; no trigger was created.';
  end if;
end;
$proposal$;

-- RLS and table grants remain intentionally unchanged. Before approval:
--   * ordinary users must not be able to insert arbitrary profiles;
--   * ordinary users must not update role or other authorization fields;
--   * authenticated admins must have an explicit, reviewed management path;
--   * the Auth provisioning function must be able to insert only through its
--     trusted SECURITY DEFINER owner context;
--   * service-role and migration roles must not gain a general NULL-auth
--     profile-write bypass.
