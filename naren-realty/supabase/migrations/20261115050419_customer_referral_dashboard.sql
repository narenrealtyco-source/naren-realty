-- NAREN REALTY: Customer referral dashboard backed by the live referral foundation.
-- Depends on referral_codes, referral_attributions, profile_activity_roles,
-- profile_capabilities and create_my_referral_code().

begin;

create or replace function public.customer_referral_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_tenant_code text;
  v_owner_code text;
  v_total bigint := 0;
  v_tenants bigint := 0;
  v_owners bigint := 0;
  v_history jsonb := '[]'::jsonb;
begin
  if v_user_id is null or not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'customer'
  ) then
    raise exception 'Customer authorization is required'
      using errcode = '42501';
  end if;

  -- Tenant links are available only after genuine tenant activity.
  if exists (
    select 1
    from public.profile_activity_roles ar
    where ar.user_id = v_user_id
      and ar.activity_role = 'tenant'
  ) then
    v_tenant_code := public.create_my_referral_code('tenant');
  end if;

  -- Owner links require Owner capability and at least one approved listing.
  if exists (
    select 1
    from public.profile_capabilities pc
    where pc.user_id = v_user_id
      and pc.capability = 'owner'
  ) and exists (
    select 1
    from public.properties p
    where p.owner_id = v_user_id
      and p.status = 'approved'
  ) then
    v_owner_code := public.create_my_referral_code('owner');
  end if;

  select
    count(*),
    count(*) filter (where ra.referral_type = 'tenant'),
    count(*) filter (where ra.referral_type = 'owner')
  into v_total, v_tenants, v_owners
  from public.referral_attributions ra
  where ra.referrer_user_id = v_user_id;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'referralType', x.referral_type,
        'rewardAmount', x.reward_amount,
        'status', x.status,
        'createdAt', x.created_at
      )
      order by x.created_at desc, x.id desc
    ),
    '[]'::jsonb
  )
  into v_history
  from (
    select ra.id, ra.referral_type, ra.reward_amount, ra.status, ra.created_at
    from public.referral_attributions ra
    where ra.referrer_user_id = v_user_id
    order by ra.created_at desc, ra.id desc
    limit 100
  ) x;

  return pg_catalog.jsonb_build_object(
    'tenantCode', v_tenant_code,
    'ownerCode', v_owner_code,
    'total', v_total,
    'tenants', v_tenants,
    'owners', v_owners,
    'history', v_history
  );
end;
$function$;

alter function public.customer_referral_dashboard() owner to postgres;
revoke all on function public.customer_referral_dashboard() from public, anon, authenticated;
grant execute on function public.customer_referral_dashboard() to authenticated;

commit;
