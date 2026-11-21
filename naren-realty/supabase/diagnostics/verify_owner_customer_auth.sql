-- READ-ONLY DIAGNOSTICS: unified Customer + Owner authentication preflight.
--
-- Run this script manually in the Supabase SQL Editor only when an authorized
-- operator is ready to inspect metadata. Every executable statement below is
-- a SELECT (including catalog and information_schema inspection). This file
-- intentionally contains no INSERT, UPDATE, DELETE, CREATE, ALTER, DROP,
-- GRANT, REVOKE, migration, or data-changing function call.
--
-- The output is metadata only. It does not expose secrets, table data, user
-- credentials, environment variables, or customer/owner contact details.

select
  current_database() as database_name,
  current_user as executing_role;

-- 1. Profiles table existence and columns.
select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name = 'profiles';

select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
order by ordinal_position;

-- Profiles constraints and their columns.
select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  kcu.ordinal_position,
  ccu.table_schema as referenced_table_schema,
  ccu.table_name as referenced_table_name,
  ccu.column_name as referenced_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
 and kcu.table_name = tc.table_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'profiles'
order by tc.constraint_name, kcu.ordinal_position;

-- 2. Existing profiles RLS state and policies.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_row_level_security,
  pg_get_userbyid(c.relowner) as table_owner
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'profiles';

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;

-- 3. Existing profiles triggers and trigger function metadata.
select
  n.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  case
    when t.tgenabled = 'O' then 'enabled'
    when t.tgenabled = 'D' then 'disabled'
    when t.tgenabled = 'R' then 'replica'
    when t.tgenabled = 'A' then 'always'
    else t.tgenabled::text
  end as trigger_state,
  pg_catalog.pg_get_triggerdef(t.oid) as trigger_definition,
  pn.nspname as function_schema,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as function_arguments,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  p.proconfig as function_configuration,
  pg_catalog.pg_get_functiondef(p.oid) as function_definition
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_proc p on p.oid = t.tgfoid
join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal
  and n.nspname = 'public'
  and c.relname = 'profiles'
order by t.tgname;

-- 4. Capability table existence, columns, constraints, RLS, and policies.
select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name = 'profile_capabilities';

select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profile_capabilities'
order by ordinal_position;

select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  kcu.ordinal_position,
  ccu.table_schema as referenced_table_schema,
  ccu.table_name as referenced_table_name,
  ccu.column_name as referenced_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
 and kcu.table_name = tc.table_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'profile_capabilities'
order by tc.constraint_name, kcu.ordinal_position;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_row_level_security,
  pg_get_userbyid(c.relowner) as table_owner
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'profile_capabilities';

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'profile_capabilities'
order by policyname;

-- 5. Properties columns, owner_id metadata, and foreign keys.
select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
order by ordinal_position;

select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
  and column_name = 'owner_id';

select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  kcu.ordinal_position,
  ccu.table_schema as referenced_table_schema,
  ccu.table_name as referenced_table_name,
  ccu.column_name as referenced_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_schema = tc.table_schema
 and kcu.table_name = tc.table_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'properties'
order by tc.constraint_name, kcu.ordinal_position;

-- 6. Existing properties RLS state, policies, and triggers.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_row_level_security,
  pg_get_userbyid(c.relowner) as table_owner
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'properties';

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename = 'properties'
order by policyname;

select
  n.nspname as table_schema,
  c.relname as table_name,
  t.tgname as trigger_name,
  case
    when t.tgenabled = 'O' then 'enabled'
    when t.tgenabled = 'D' then 'disabled'
    when t.tgenabled = 'R' then 'replica'
    when t.tgenabled = 'A' then 'always'
    else t.tgenabled::text
  end as trigger_state,
  pg_catalog.pg_get_triggerdef(t.oid) as trigger_definition,
  pn.nspname as function_schema,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as function_arguments,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  p.proconfig as function_configuration,
  pg_catalog.pg_get_functiondef(p.oid) as function_definition
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
join pg_catalog.pg_proc p on p.oid = t.tgfoid
join pg_catalog.pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal
  and n.nspname = 'public'
  and c.relname = 'properties'
order by t.tgname;

-- 7. Existing is_admin() definition, owner, security mode, and grants metadata.
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as function_arguments,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  p.proleakproof as leakproof,
  p.provolatile as volatility,
  p.proconfig as function_configuration,
  pg_catalog.pg_get_functiondef(p.oid) as function_definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_admin';

select
  routine_schema,
  routine_name,
  specific_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'is_admin'
order by specific_name, grantee, privilege_type;

-- 8. Relevant function owners and SECURITY DEFINER settings.
select
  n.nspname as function_schema,
  p.proname as function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as function_arguments,
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  r.rolcanlogin as owner_can_login,
  r.rolsuper as owner_is_superuser,
  r.rolcreaterole as owner_can_create_roles,
  r.rolbypassrls as owner_bypasses_rls,
  p.prosecdef as security_definer,
  p.proconfig as function_configuration,
  p.proacl as function_acl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
join pg_catalog.pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and (
    p.proname in (
      'is_admin',
      'is_naren_admin',
      'provision_customer_profile_v4',
      'protect_profile_role_v4',
      'accept_current_policy',
      'acknowledge_brokerage',
      'prepare_brokerage_acknowledgement'
    )
    or p.proname ilike '%owner%'
    or p.proname ilike '%capabilit%'
    or p.proname ilike '%profile%'
  )
order by p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid);
