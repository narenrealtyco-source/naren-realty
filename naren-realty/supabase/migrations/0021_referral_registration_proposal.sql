-- REVIEW-ONLY PROPOSAL. DO NOT APPLY until the live Supabase schema,
-- Auth trigger ordering, SECURITY DEFINER owners, grants, and RLS behavior
-- have been independently inspected and this migration is approved.
--
-- Scope: referral code issuance and immutable signup attribution only.
-- It does NOT implement reward approval, transaction verification, claims,
-- bank details, or payouts. Referrals remain disabled by default.
begin;

do $preflight$
begin
  if to_regclass('auth.users') is null or to_regclass('public.profiles') is null then
    raise exception 'BLOCKED: auth.users or public.profiles is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'id' and data_type = 'uuid'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'role'
  ) then
    raise exception 'BLOCKED: public.profiles must contain UUID id and role columns';
  end if;

  if to_regclass('public.referral_settings') is not null
     or to_regclass('public.customer_referral_codes') is not null
     or to_regclass('public.customer_referrals') is not null then
    raise exception 'BLOCKED: referral objects already exist; reconcile them before continuing';
  end if;

  if exists (
    select 1 from pg_catalog.pg_trigger
    where not tgisinternal
      and (
        (tgrelid = 'auth.users'::regclass and tgname = 'capture_signup_referral')
        or (tgrelid = 'public.profiles'::regclass and tgname = 'profiles_create_customer_referral_code')
      )
  ) then
    raise exception 'BLOCKED: one or more referral triggers already exist';
  end if;
end;
$preflight$;

create table public.referral_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into public.referral_settings(singleton, enabled) values (true, false);

create table public.customer_referral_codes (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^NAREN-[0-9A-F]{24}$'),
  created_at timestamptz not null default now()
);

create table public.customer_referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_id uuid not null references public.customer_referral_codes(customer_id),
  referral_code text not null references public.customer_referral_codes(code),
  category text not null check (category in ('tenant', 'owner')),
  registered_at timestamptz not null default now(),
  check (referred_user_id <> referrer_id)
);
create index customer_referrals_referrer_created_idx
  on public.customer_referrals(referrer_id, registered_at desc);

alter table public.referral_settings enable row level security;
alter table public.customer_referral_codes enable row level security;
alter table public.customer_referrals enable row level security;
revoke all on public.referral_settings, public.customer_referral_codes, public.customer_referrals
  from public, anon, authenticated;

-- Internal helper. It only creates codes for profiles whose trusted database
-- role is customer. It is not executable directly by API roles.
create function public.ensure_customer_referral_code(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempts integer := 0;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_customer_id and role = 'customer'
  ) then
    return;
  end if;

  loop
    v_attempts := v_attempts + 1;
    insert into public.customer_referral_codes(customer_id, code)
    values (
      p_customer_id,
      'NAREN-' || pg_catalog.upper(
        pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 24)
      )
    )
    on conflict do nothing;

    if exists (
      select 1 from public.customer_referral_codes where customer_id = p_customer_id
    ) then
      return;
    end if;

    if v_attempts >= 10 then
      raise exception 'Could not allocate a unique referral code';
    end if;
  end loop;
end;
$function$;
revoke all on function public.ensure_customer_referral_code(uuid) from public, anon, authenticated;

-- New customer profiles receive a code automatically after profile creation.
create function public.create_customer_referral_code_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.role = 'customer' then
    perform public.ensure_customer_referral_code(new.id);
  end if;
  return new;
end;
$function$;
revoke all on function public.create_customer_referral_code_on_profile() from public, anon, authenticated;

create trigger profiles_create_customer_referral_code
  after insert on public.profiles
  for each row execute function public.create_customer_referral_code_on_profile();

-- Backfill codes for existing customer profiles. Existing customer data is
-- not otherwise modified.
do $backfill$
declare
  customer_row record;
begin
  for customer_row in
    select id from public.profiles where role = 'customer'
  loop
    perform public.ensure_customer_referral_code(customer_row.id);
  end loop;
end;
$backfill$;

-- Customer dashboard returns only the caller's code, counts, and referral
-- category/date. It never exposes referred users' IDs or contact details.
create function public.customer_referral_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_code text;
  v_total bigint;
  v_tenant bigint;
  v_owner bigint;
  v_history jsonb;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'customer'
  ) then
    raise exception 'Customer authorization is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.referral_settings where singleton and enabled
  ) then
    raise exception 'Referral registration is unavailable' using errcode = '55000';
  end if;

  perform public.ensure_customer_referral_code(v_actor);
  select code into v_code
  from public.customer_referral_codes
  where customer_id = v_actor;

  select count(*),
         count(*) filter (where category = 'tenant'),
         count(*) filter (where category = 'owner')
    into v_total, v_tenant, v_owner
    from public.customer_referrals
    where referrer_id = v_actor;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'category', item.category,
        'registeredAt', item.registered_at
      ) order by item.registered_at desc, item.referred_user_id desc
    ),
    '[]'::jsonb
  )
    into v_history
    from (
      select category, registered_at, referred_user_id
      from public.customer_referrals
      where referrer_id = v_actor
      order by registered_at desc, referred_user_id desc
      limit 100
    ) item;

  return pg_catalog.jsonb_build_object(
    'code', v_code,
    'total', v_total,
    'tenants', v_tenant,
    'owners', v_owner,
    'history', v_history
  );
end;
$function$;
revoke all on function public.customer_referral_dashboard() from public, anon, authenticated;
grant execute on function public.customer_referral_dashboard() to authenticated;

-- Signup attribution is captured only from Auth metadata at user creation.
-- Later profile/metadata edits cannot change the referrer. Invalid or disabled
-- referral codes abort that referred signup rather than silently losing credit.
create function public.capture_signup_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text := pg_catalog.upper(
    pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'referral_code', ''))
  );
  v_category text := coalesce(new.raw_user_meta_data->>'referral_category', '');
  v_referrer uuid;
begin
  if v_code = '' and v_category = '' then
    return new;
  end if;

  if not exists (
    select 1 from public.referral_settings where singleton and enabled
  ) then
    raise exception 'Referral registration is unavailable' using errcode = '55000';
  end if;

  if v_code !~ '^NAREN-[0-9A-F]{24}$'
     or v_category not in ('tenant', 'owner') then
    raise exception 'Invalid referral information' using errcode = '22023';
  end if;

  select customer_id into v_referrer
  from public.customer_referral_codes
  where code = v_code;

  if v_referrer is null or v_referrer = new.id then
    raise exception 'Invalid referral information' using errcode = '22023';
  end if;

  insert into public.customer_referrals(
    referred_user_id, referrer_id, referral_code, category
  ) values (new.id, v_referrer, v_code, v_category);

  return new;
end;
$function$;
revoke all on function public.capture_signup_referral() from public, anon, authenticated;

create trigger capture_signup_referral
  after insert on auth.users
  for each row execute function public.capture_signup_referral();

-- IMPORTANT REVIEW BEFORE APPLYING:
-- 1. Inspect all existing auth.users and profiles triggers and their ordering.
-- 2. Verify SECURITY DEFINER ownership for every function above is a trusted
--    non-login database role with only the required privileges.
-- 3. Verify RLS is enabled and not FORCE RLS on the new tables, and that no
--    API role inherits the function owner's privileges.
-- 4. Keep referral_settings.enabled = false until isolated signup/RLS tests pass.
-- 5. This migration does not grant any Admin access to referred-user details.

commit;
