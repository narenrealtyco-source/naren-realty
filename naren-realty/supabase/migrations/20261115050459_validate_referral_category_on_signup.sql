-- Enforce that the signup's selected referral category matches the code type.
-- The code remains the authoritative source; category metadata cannot reclassify it.

begin;

create or replace function public.capture_signup_referral()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));
  v_category text := lower(trim(coalesce(new.raw_user_meta_data ->> 'referral_category', '')));
  v_referral public.referral_codes%rowtype;
  v_reward numeric(12,2);
begin
  if v_code = '' then
    return new;
  end if;

  select * into v_referral
  from public.referral_codes
  where code = v_code
    and is_active = true;

  if not found or v_referral.user_id = new.id then
    raise exception 'Invalid referral information' using errcode = '22023';
  end if;

  if v_category not in ('tenant', 'owner')
     or v_category <> v_referral.referrer_type then
    raise exception 'Referral category does not match the referral code'
      using errcode = '22023';
  end if;

  if v_referral.referrer_type = 'owner' and (
    not exists (
      select 1 from public.profile_capabilities
      where user_id = v_referral.user_id and capability = 'owner'
    )
    or not exists (
      select 1 from public.properties
      where owner_id = v_referral.user_id and status = 'approved'
    )
  ) then
    raise exception 'Owner referral code is not eligible' using errcode = '22023';
  end if;

  v_reward := case
    when v_referral.referrer_type = 'tenant' then 1000
    else 2000
  end;

  insert into public.referral_attributions (
    referrer_user_id,
    referred_user_id,
    referral_code_id,
    referral_type,
    reward_amount
  )
  values (
    v_referral.user_id,
    new.id,
    v_referral.id,
    v_referral.referrer_type,
    v_reward
  );

  return new;
end;
$function$;

alter function public.capture_signup_referral() owner to postgres;
revoke all on function public.capture_signup_referral() from public, anon, authenticated;
grant execute on function public.capture_signup_referral() to service_role;

commit;
