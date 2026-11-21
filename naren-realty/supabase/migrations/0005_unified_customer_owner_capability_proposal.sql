-- REVIEW-ONLY PROPOSAL: unified Customer + Owner authentication.
--
-- DO NOT EXECUTE this file yet. It is a versioned design and migration
-- proposal based on the completed read-only Supabase inspection.
--
-- Confirmed live facts:
--   * public.profiles has id, full_name, phone, role, created_at, and
--     registration_category.
--   * profile_capabilities does not currently exist.
--   * public.properties.owner_id is uuid.
--   * auth.users has on_auth_user_created -> public.handle_new_user().
--   * The current handle_new_user() trusts signup metadata role = 'owner'.
--   * Existing owner property INSERT authorization uses profiles.role = owner.
--   * Existing owner property UPDATE authorization restricts users to their own
--     pending/rejected properties.
--   * Admin authorization uses profiles.role = admin and is_admin().
--
-- Goals:
--   * Keep one Supabase Auth account and session for both capabilities.
--   * Keep a customer's profiles.role = customer after owner activation.
--   * Add owner access as a server-granted capability.
--   * Preserve existing profiles, owner accounts, and properties.
--   * Keep Admin authorization and enquiry policies unchanged.
--   * Never grant owners access to public.enquiries or customer contact data.
--   * Keep Broker access disabled; no broker capability is introduced.
--
-- This proposal intentionally does not migrate or delete LocalStorage data.
-- Existing owner records and properties must be backed up and mapped to
-- Supabase Auth IDs in a separate, explicitly approved migration.

-- ---------------------------------------------------------------------------
-- 0. Required manual preflight before approval
-- ---------------------------------------------------------------------------
--
-- Re-run supabase/diagnostics/verify_owner_customer_auth.sql and review:
--   * the complete handle_new_user() definition and owner/grants;
--   * exact properties owner INSERT/UPDATE policy names and expressions;
--   * all properties policies, including any public and admin policies;
--   * profiles RLS policies and role-protection triggers;
--   * SECURITY DEFINER owners, search_path, and EXECUTE grants.
--
-- Stop if any result differs from the assumptions above. In particular, do
-- not drop or replace an owner policy by guessed name.
--
-- The SECURITY DEFINER functions below require a trusted, non-login owner.
-- The live operator must select that owner from catalog metadata, verify that
-- untrusted login roles cannot inherit or SET ROLE into it, verify its access
-- to the capability table under RLS, and only then apply the owner changes.
-- Do not assume postgres, service_role, or any other role name.

-- ---------------------------------------------------------------------------
-- 1. Additive capability schema
-- ---------------------------------------------------------------------------
--
-- This table is additive. profiles.role remains the compatibility role used
-- by the existing Customer and Admin application paths.
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

-- There are deliberately no client INSERT, UPDATE, or DELETE policies.
-- Capability grants must use the server-side function below.

-- ---------------------------------------------------------------------------
-- 2. Capability lookup helper
-- ---------------------------------------------------------------------------
--
-- This helper is used by properties RLS and must not be callable as a
-- privilege-escalation primitive. It returns only whether the current Auth
-- user has owner capability and never accepts a caller-supplied user ID.
create function public.has_owner_capability()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profile_capabilities
    where user_id = auth.uid()
      and capability = 'owner'
  );
$function$;

revoke all on function public.has_owner_capability() from public;
grant execute on function public.has_owner_capability() to authenticated;

-- REQUIRED MANUAL STEP:
-- Transfer ownership of has_owner_capability() to the independently verified
-- trusted non-login SECURITY DEFINER owner. Do not use a guessed role name.
--
-- alter function public.has_owner_capability() owner to <verified_runtime_owner>;

-- ---------------------------------------------------------------------------
-- 3. Server-side owner activation
-- ---------------------------------------------------------------------------
--
-- This function is the only proposed customer-to-owner activation path.
-- It preserves profiles.role = customer and changes only the capability table
-- plus the existing registration_category field.
--
-- The application must call this through a protected server action using the
-- existing SSR Supabase client. Browser metadata, JWT role claims, and a
-- browser-supplied user ID are not trusted.
create function public.activate_owner_capability(p_registration_category text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_registration_category not in ('Rental', 'Resale', 'PG', 'Airbnb') then
    raise exception 'Invalid owner registration category';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role = 'customer'
  ) then
    raise exception 'Customer profile is required for owner activation';
  end if;

  insert into public.profile_capabilities (user_id, capability, granted_by)
  values (v_user_id, 'owner', v_user_id)
  on conflict (user_id, capability) do nothing;

  update public.profiles
  set registration_category = p_registration_category
  where id = v_user_id
    and role = 'customer';

  return true;
end;
$function$;

revoke all on function public.activate_owner_capability(text) from public;
grant execute on function public.activate_owner_capability(text) to authenticated;

-- REQUIRED MANUAL STEP:
-- Transfer ownership only after the SECURITY DEFINER preflight is complete.
--
-- alter function public.activate_owner_capability(text)
--   owner to <verified_runtime_owner>;

-- ---------------------------------------------------------------------------
-- 4. Correct future Auth signup provisioning
-- ---------------------------------------------------------------------------
--
-- The current handle_new_user() trusts raw signup metadata role = owner.
-- That allows a browser to request an owner profile. Existing owner profiles
-- are not changed by this replacement. Future signups always receive the
-- fixed customer role; owner capability is granted only by the activation
-- function above.
--
-- Before applying this section, verify that the trigger function has the
-- exact public.handle_new_user() signature and that no other provisioning
-- trigger depends on its current role behavior.
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
  );

  return new;
end;
$function$;

-- REQUIRED MANUAL STEP:
-- Re-verify the trigger still calls this exact function, then assign the
-- trusted non-login SECURITY DEFINER owner and remove untrusted EXECUTE.
--
-- alter function public.handle_new_user() owner to <verified_runtime_owner>;
-- revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Properties RLS policy replacement proposal
-- ---------------------------------------------------------------------------
--
-- Existing owner INSERT and UPDATE policies must be replaced, not merely
-- supplemented: PostgreSQL combines permissive policies with OR, but an
-- existing role = owner requirement would still prevent newly activated
-- customers from inserting or updating properties.
--
-- Do not execute the following policy changes until the exact live policy
-- names and definitions have been reviewed. Preserve all public-read and
-- Admin policies. Replace only the owner-specific INSERT/UPDATE policies with
-- equivalent policies using the capability helper.
--
-- Proposed owner INSERT policy:
--
-- create policy properties_owner_insert_capability
--   on public.properties
--   for insert
--   to authenticated
--   with check (
--     owner_id = auth.uid()
--     and (
--       public.has_owner_capability()
--       or exists (
--         select 1
--         from public.profiles
--         where id = auth.uid()
--           and role = 'owner'
--       )
--     )
--   );
--
-- Proposed owner SELECT policy, if the existing owner SELECT policy is also
-- role-based:
--
-- create policy properties_owner_select_capability
--   on public.properties
--   for select
--   to authenticated
--   using (
--     owner_id = auth.uid()
--     and (
--       public.has_owner_capability()
--       or exists (
--         select 1
--         from public.profiles
--         where id = auth.uid()
--           and role = 'owner'
--       )
--     )
--   );
--
-- Proposed owner UPDATE policy:
--
-- create policy properties_owner_update_capability
--   on public.properties
--   for update
--   to authenticated
--   using (
--     owner_id = auth.uid()
--     and status in ('pending', 'rejected')
--     and (
--       public.has_owner_capability()
--       or exists (
--         select 1
--         from public.profiles
--         where id = auth.uid()
--           and role = 'owner'
--       )
--     )
--   )
--   with check (
--     owner_id = auth.uid()
--     and (
--       public.has_owner_capability()
--       or exists (
--         select 1
--         from public.profiles
--         where id = auth.uid()
--           and role = 'owner'
--       )
--     )
--   );
--
-- The final UPDATE policy must also preserve the existing restriction that
-- owners cannot change owner_id or set an unauthorized review status. Admin
-- policies remain unchanged. Do not add a DELETE policy unless the complete
-- existing owner deletion behavior is reviewed separately. No owner policy
-- may expose public.enquiries or customer contact details.

-- ---------------------------------------------------------------------------
-- 6. Application implementation plan
-- ---------------------------------------------------------------------------
--
-- No application changes are made by this proposal. After the migration is
-- manually approved and tested:
--
--   * Add app/lib/owner-supabase-data.ts with protected SSR reads/writes.
--   * Update app/owner/page.tsx to use the current Supabase Auth session.
--   * Replace LocalStorage owner login/register calls with Supabase Auth and
--     activate_owner_capability().
--   * Keep LocalStorage owner records, favourites, policies, and listings
--     readable; do not delete, overwrite, or silently import them.
--   * Keep owner queries filtered by owner_id = auth.uid().
--   * Never query public.enquiries from owner code.
--   * Keep Admin pages and requireAdmin() unchanged.
--   * Do not add Broker UI, capability, policies, or server actions.

-- ---------------------------------------------------------------------------
-- 7. Rollback and unresolved risks
-- ---------------------------------------------------------------------------
--
-- Rollback must be planned before deployment:
--   * disable the new owner UI/server path;
--   * remove only the newly added capability policies/functions after
--     confirming no active owner listing depends on them;
--   * restore the reviewed previous handle_new_user() definition if required;
--   * do not delete profile_capabilities rows or existing owner properties
--     without a separately approved data-retention decision.
--
-- Unresolved before manual approval:
--   * exact live properties owner policy names and complete expressions;
--   * whether properties status values are lowercase in every live policy;
--   * trusted SECURITY DEFINER owner and role-membership verification;
--   * whether profiles role-protection triggers permit this category update;
--   * whether policy acceptance is required before owner activation;
--   * mapping of legacy LocalStorage owner IDs to Supabase Auth IDs.
