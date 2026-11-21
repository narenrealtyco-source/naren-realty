-- REVIEW-ONLY PROPOSAL: Phase 1 security foundation v2.
-- Do not run until the live profiles/properties schema, function definitions,
-- function owners, grants, triggers, and existing RLS policies have been
-- inspected in the target Supabase project.
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
--     profiles.role for the authenticated user; it does not call either SQL
--     helper.
--   * supabase/policies.sql currently defines is_naren_admin() from
--     auth.jwt() app_metadata and defines policy RPCs that use that helper.
--   * The repository does not establish the live definitions, owners, grants,
--     or dependencies of those functions. They must be inspected first.
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
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in (
--       'is_admin',
--       'is_naren_admin',
--       'prevent_profile_role_change',
--       'prevent_profile_self_role_change_v2'
--     );
--
--   select grantee, routine_schema, routine_name, privilege_type
--   from information_schema.routine_privileges
--   where routine_schema = 'public'
--     and routine_name in ('is_admin', 'is_naren_admin');
--
--   select tgname, tgenabled, pg_get_triggerdef(oid)
--   from pg_trigger
--   where tgrelid = 'public.profiles'::regclass
--     and not tgisinternal;
--
-- SECURITY DEFINER owner requirements:
--   * Functions must be owned by a trusted, non-login migration/database owner.
--   * The owner must not be a role that untrusted users can use to create or
--     alter objects in schemas searched by the function.
--   * Confirm the owner and privileges manually; this proposal does not
--     assume a particular Supabase database role and does not change ownership.

-- Create a new trusted helper only when no live is_admin() exists. If one
-- already exists, stop and review its definition/owner rather than replacing
-- it implicitly.
do $proposal$
begin
  if to_regprocedure('public.is_admin()') is null then
    execute $function$
      create function public.is_admin()
      returns boolean
      language sql
      stable
      security definer
      set search_path = pg_catalog, public
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
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
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
-- After inspection, a separately approved migration may replace its
-- app_metadata implementation with a profile-based implementation using the
-- same fixed search_path and owner requirements described above.

-- Create a separate trigger function only when it does not already exist.
-- A role change is allowed only when an authenticated admin changes another
-- user's role. Self-changes and auth.uid() NULL changes are rejected.
do $proposal$
begin
  if to_regprocedure('public.prevent_profile_self_role_change_v2()') is null then
    execute $function$
      create function public.prevent_profile_self_role_change_v2()
      returns trigger
      language plpgsql
      security definer
      set search_path = pg_catalog, public
      as $body$
      begin
        if new.role is distinct from old.role then
          if auth.uid() is null then
            raise exception 'Authenticated admin authorization is required for profile role changes';
          end if;

          if auth.uid() = old.id then
            raise exception 'Profile roles cannot be changed by the profile owner';
          end if;

          if not exists (
            select 1
            from public.profiles
            where id = auth.uid()
              and role = 'admin'
          ) then
            raise exception 'Admin authorization is required for profile role changes';
          end if;
        end if;
        return new;
      end;
      $body$
    $function$;

    revoke all on function public.prevent_profile_self_role_change_v2() from public;
  else
    raise notice
      'prevent_profile_self_role_change_v2() already exists; no replacement was performed.';
  end if;
end;
$proposal$;

-- Add the trigger only if the live profiles table has the required columns
-- and no trigger with this exact name exists. This does not enable RLS or
-- create any profile SELECT, INSERT, or UPDATE policy.
do $proposal$
begin
  if to_regclass('public.profiles') is null then
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
      'public.profiles lacks id or role; no role-change trigger was created.';
  elsif not exists (
    select 1
    from pg_trigger
    where tgname = 'profiles_prevent_self_role_change_v2'
      and tgrelid = 'public.profiles'::regclass
  ) then
    execute '
      create trigger profiles_prevent_self_role_change_v2
      before update of role on public.profiles
      for each row
      execute function public.prevent_profile_self_role_change_v2()
    ';
  else
    if not exists (
      select 1
      from pg_trigger t
      join pg_proc p on p.oid = t.tgfoid
      join pg_namespace n on n.oid = p.pronamespace
      where t.tgname = 'profiles_prevent_self_role_change_v2'
        and t.tgrelid = 'public.profiles'::regclass
        and n.nspname = 'public'
        and p.proname = 'prevent_profile_self_role_change_v2'
    ) then
      raise exception
        'A conflicting profiles_prevent_self_role_change_v2 trigger already exists';
    end if;
    raise notice
      'profiles_prevent_self_role_change_v2 already exists with the expected function; no trigger was created.';
  end if;
end;
$proposal$;

-- Profiles RLS is intentionally not changed here. Before any future RLS
-- migration, review all required SELECT, INSERT, and UPDATE access for:
--   * authenticated customers reading their own profile;
--   * authenticated owners reading their own profile;
--   * profile creation during signup, if applicable;
--   * controlled admin profile management;
--   * server-side Auth/profile synchronization.
--
-- Properties RLS is intentionally not changed here. Before any future
-- properties migration, review all existing public, owner, and admin policies,
-- the owner_id type and relationship, and the columns exposed to anonymous
-- readers. The confirmed application columns alone are insufficient to safely
-- reconstruct the live policy set.
