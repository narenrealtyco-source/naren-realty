-- REVIEW-ONLY PROPOSAL. Do not execute until the profiles schema and existing
-- policies have been reviewed in the target Supabase project.
--
-- This helper must derive authorization only from auth.uid() and the trusted
-- profiles.role value. It must not accept a browser-supplied user ID or role.
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

-- Grant only function execution; do not grant table access through this
-- proposal. Review existing profiles RLS before adding a self-profile policy.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Add table-specific admin policies only after confirming each table's schema
-- and preserving any existing public-read policies. Do not use service_role
-- from the browser.
