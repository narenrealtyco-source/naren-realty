-- REVIEW-ONLY PROPOSAL: Phase 1 security foundation.
-- Do not run until the live profiles/properties schema and existing policies
-- have been inspected in Supabase SQL Editor.
--
-- This proposal is additive and preserves rows, users, and existing tables.

-- Trusted admin authorization source: auth.uid() -> profiles.id -> profiles.role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Compatibility wrapper for existing policy definitions. This removes the
-- JWT app_metadata role assumption without dropping existing policies.
create or replace function public.is_naren_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.is_admin();
$$;

revoke all on function public.is_naren_admin() from public;
grant execute on function public.is_naren_admin() to authenticated;

-- Prevent a signed-in user from changing their own profile role. Role
-- administration remains a controlled server/SQL operation.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'Profile roles cannot be changed by the profile owner';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_profile_role_change() from public;

do $$
begin
  if to_regclass('public.profiles') is not null
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'id'
     )
     and exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'profiles'
         and column_name = 'role'
     )
     and not exists (
       select 1
       from pg_trigger
       where tgname = 'profiles_prevent_self_role_change'
         and tgrelid = 'public.profiles'::regclass
     ) then
    execute '
      create trigger profiles_prevent_self_role_change
      before update of role on public.profiles
      for each row
      execute function public.prevent_profile_role_change()
    ';
  end if;
end;
$$;

-- Enable RLS and allow a user to read only their own profile. This does not
-- grant profile updates and does not replace existing policies.
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles enable row level security';
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'profiles'
        and policyname = 'profiles_select_own_phase1'
    ) then
      execute '
        create policy profiles_select_own_phase1
        on public.profiles for select
        to authenticated
        using (id = auth.uid())
      ';
    end if;
  end if;
end;
$$;

-- Admin access for the confirmed properties table. The status predicate is
-- intentionally not used here; admins need to review all property statuses.
do $$
begin
  if to_regclass('public.properties') is not null then
    execute 'alter table public.properties enable row level security';
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'properties'
        and policyname = 'properties_admin_all_phase1'
    ) then
      execute '
        create policy properties_admin_all_phase1
        on public.properties for all
        to authenticated
        using (public.is_admin())
        with check (public.is_admin())
      ';
    end if;
  end if;
end;
$$;

-- Do not add an owner policy until the live owner_id type and owner/profile
-- relationship are confirmed. Do not add a public property policy here until
-- the existing public-read policy is reviewed for owner_id exposure.
