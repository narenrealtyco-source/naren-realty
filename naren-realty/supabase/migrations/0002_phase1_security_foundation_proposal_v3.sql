-- REVIEW-ONLY PROPOSAL: Phase 1 security foundation v3.
-- Do not run until the live profiles schema, function definitions, function
-- owners, grants, triggers, and existing RLS policies have been inspected.
--
-- This version intentionally does not:
--   * enable or disable RLS;
--   * create, replace, or drop any profiles/properties policy;
--   * replace public.is_naren_admin();
--   * replace any existing function;
--   * change application code or existing data.
--
-- Repository findings:
--   * app/lib/supabase-server.ts authorizes Admin requests by querying
--     public.profiles.role for the authenticated user.
--   * supabase/policies.sql currently defines is_naren_admin() from
--     auth.jwt() app_metadata.
--   * Existing live definitions, owners, grants, triggers, and RLS policies
--     are not established by this repository.
--
-- Required live inspection before approval:
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
--   where n.nspname = 'public'
--     and p.proname in (
--       'is_admin',
--       'is_naren_admin',
--       'protect_profile_role_v3'
--     );
--
--   select grantee, routine_schema, routine_name, privilege_type
--   from information_schema.routine_privileges
--   where routine_schema = 'public'
--     and routine_name in ('is_admin', 'is_naren_admin');
--
--   select tgname, tgenabled, pg_catalog.pg_get_triggerdef(oid)
--   from pg_catalog.pg_trigger
--   where tgrelid = 'public.profiles'::pg_catalog.regclass
--     and not tgisinternal;
--
-- SECURITY DEFINER owner requirements:
--   * Functions must be owned by a trusted, non-login migration/database owner.
--   * The owner must not be a role that untrusted users can use to create or
--     alter objects in schemas searched by the function.
--   * Confirm the owner and privileges manually; this proposal does not
--     assume a particular Supabase database role and does not change ownership.

-- Create a new trusted helper only when no live is_admin() exists. If one
-- already exists, stop and review its definition, owner, and grants instead
-- of replacing it implicitly.
do $proposal$
begin
  if pg_catalog.to_regprocedure('public.is_admin()') is null then
    execute $function$
      create function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = ''
      as $body$
        select exists (
          select 1
          from public.profiles
          where id = auth.uid()
            and role = 'admin'
        );
      $body$
    $function$;

    revoke all on function public.is_admin() from public;
    if exists (
      select 1
      from pg_catalog.pg_roles
      where rolname = 'authenticated'
    ) then
      grant execute on function public.is_admin() to authenticated;
    else
      raise notice
        'The authenticated role does not exist; is_admin() remains inaccessible until its grant is reviewed.';
    end if;
  else
    raise notice
      'public.is_admin() already exists; no replacement was performed. Review its definition, owner, and grants manually.';
  end if;
end;
$proposal$;

-- Do not replace public.is_naren_admin(). Existing repository policies call
-- it, but its live definition and dependencies are not established here.
-- A separately approved migration may align it with profiles.role after
-- inspection.

-- Protect both profile creation and role changes:
--   * auth.uid() NULL is rejected by default.
--   * A non-admin authenticated user may create only their own profile and
--     may not assign the exact application admin value 'admin'.
--   * An authenticated admin may create another profile with any existing
--     application role value; no non-admin role list is assumed.
--   * A role update requires an authenticated admin and cannot target the
--     caller's own profile.
--
-- This function is SECURITY DEFINER only so it can read the caller's trusted
-- profile role independently of profiles RLS. Its owner and grants must be
-- verified manually before deployment.
do $proposal$
begin
  if pg_catalog.to_regprocedure('public.protect_profile_role_v3()') is null then
    execute $function$
      create function public.protect_profile_role_v3()
      returns trigger
      language plpgsql
      security definer
      set search_path = ''
      as $body$
      declare
        v_is_admin boolean;
      begin
        if auth.uid() is null then
          raise exception 'Authenticated authorization is required for profile role operations';
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

            if new.role = 'admin' then
              raise exception 'Users may not create an admin profile';
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

    revoke all on function public.protect_profile_role_v3() from public;
  else
    raise notice
      'public.protect_profile_role_v3() already exists; no replacement was performed.';
  end if;
end;
$proposal$;

-- Add the trigger only if the live profiles table has the required columns
-- and no trigger with this exact name exists. This does not enable RLS or
-- create any profile SELECT, INSERT, or UPDATE policy.
do $proposal$
begin
  if pg_catalog.to_regclass('public.profiles') is null then
    raise notice 'public.profiles does not exist; no trigger was created.';
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
      'public.profiles lacks id or role; no role-protection trigger was created.';
  elsif not exists (
    select 1
    from pg_catalog.pg_trigger
    where tgname = 'profiles_protect_role_v3'
      and tgrelid = 'public.profiles'::pg_catalog.regclass
  ) then
    execute '
      create trigger profiles_protect_role_v3
      before insert or update of role on public.profiles
      for each row
      execute function public.protect_profile_role_v3()
    ';
  else
    if not exists (
      select 1
      from pg_catalog.pg_trigger t
      join pg_catalog.pg_proc p on p.oid = t.tgfoid
      join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where t.tgname = 'profiles_protect_role_v3'
        and t.tgrelid = 'public.profiles'::pg_catalog.regclass
        and n.nspname = 'public'
        and p.proname = 'protect_profile_role_v3'
    ) then
      raise exception
        'A conflicting profiles_protect_role_v3 trigger already exists';
    end if;
    raise notice
      'profiles_protect_role_v3 already exists with the expected function; no trigger was created.';
  end if;
end;
$proposal$;

-- Signup behavior:
--   This trigger rejects INSERT operations where auth.uid() is NULL. That is
--   deliberate: NULL does not prove that the caller is a trusted server.
--   Supabase Auth/database signup provisioning must therefore use an existing
--   trusted Auth/database trigger or a separately approved SECURITY DEFINER
--   provisioning function that assigns a non-admin role without accepting a
--   browser-supplied role. The provisioning path must be granted only to its
--   trusted caller and must validate the Auth user ID.
--
-- Trusted server-side operations:
--   Direct migrations or service-role operations with auth.uid() NULL must use
--   a separately permissioned, reviewed provisioning path. They do not bypass
--   this trigger implicitly. This prevents NULL-auth execution from becoming
--   an accidental role-escalation escape hatch.
--
-- Profiles RLS is intentionally not changed here. Required SELECT, INSERT,
-- and UPDATE policies must be reviewed separately. In particular, RLS must
-- prevent ordinary users from updating arbitrary profile rows, while still
-- permitting the authenticated Admin path and the approved signup path.
--
-- Properties RLS is intentionally not changed here. Existing public, owner,
-- and admin policies must be reviewed before any future properties migration.
