-- REVIEW-ONLY PROPOSAL: align policy RPC role checks with profiles.role.
-- Do not run until profiles roles for customer and owner accounts are
-- confirmed and existing policy RPC dependencies are reviewed.

create or replace function public.accept_current_policy(
  p_policy_type text,
  p_user_role text,
  p_brokerage_category text default null,
  p_transaction_reference text default null
)
returns public.policy_acceptances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.policy_documents;
  v_user_role text;
  v_acceptance public.policy_acceptances;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select role into v_user_role
  from public.profiles
  where id = auth.uid();

  if v_user_role <> p_user_role
     or p_user_role not in ('customer', 'owner') then
    raise exception 'Role does not match authenticated account';
  end if;

  select * into v_policy
  from public.policy_documents
  where policy_type = p_policy_type;

  if not found then
    raise exception 'Unknown policy type';
  end if;

  insert into public.policy_acceptances (
    user_id,
    user_role,
    policy_type,
    policy_version,
    accepted_at,
    brokerage_category,
    transaction_reference
  )
  values (
    auth.uid(),
    p_user_role,
    p_policy_type,
    v_policy.version,
    now(),
    p_brokerage_category,
    p_transaction_reference
  )
  on conflict do nothing
  returning * into v_acceptance;

  if v_acceptance.id is null then
    select * into v_acceptance
    from public.policy_acceptances
    where user_id = auth.uid()
      and user_role = p_user_role
      and policy_type = p_policy_type
      and policy_version = v_policy.version
      and transaction_reference is not distinct from p_transaction_reference
    limit 1;
  end if;

  return v_acceptance;
end;
$$;

revoke all on function public.accept_current_policy(text, text, text, text) from public;
grant execute on function public.accept_current_policy(text, text, text, text) to authenticated;

-- Existing policy_acceptances and brokerage_acknowledgements RLS policies
-- reference public.is_naren_admin(); migration 0002 changes that compatibility
-- helper to the trusted profiles.role source without dropping those policies.
