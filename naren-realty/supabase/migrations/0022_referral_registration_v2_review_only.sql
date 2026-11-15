-- NAREN REALTY — Referral Registration v2 (REVIEW ONLY; category captures signup intent)
-- Prepared after read-only inspection of the live project.
-- DO NOT APPLY until the app-side signup integration and isolated security tests pass.
-- This proposal records referral attribution only. It does NOT implement reward approval,
-- bank details, payout, or Admin referral management.

begin;

-- Preflight: stop if any target objects already exist or the current Auth profile
-- trigger/function no longer match the inspected baseline.
do $preflight$
declare
  v_trigger_count integer;
  v_function_count integer;
begin
  if to_regclass('auth.users') is null or to_regclass('public.profiles') is null then
    raise exception 'Required Auth users or public.profiles table is missing';
  end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('referral_settings','customer_referral_codes','customer_referrals')
  ) then
    raise exception 'Referral tables already exist; inspect them before deployment';
  end if;

  if to_regnamespace('naren_private') is not null then
    raise exception 'Schema naren_private already exists; inspect it before deployment';
  end if;

  if exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal
      and n.nspname='auth'
      and c.relname='users'
      and t.tgname='capture_signup_referral'
  ) then
    raise exception 'Auth trigger capture_signup_referral already exists; inspect before deployment';
  end if;

  select count(*) into v_trigger_count
  from pg_trigger t
  join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where not t.tgisinternal
    and n.nspname='auth'
    and c.relname='users'
    and t.tgname='on_auth_user_created'
    and pg_get_triggerdef(t.oid) ilike '%handle_new_user%';

  select count(*) into v_function_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname='handle_new_user'
    and pg_get_userbyid(p.proowner)='postgres'
    and pg_get_functiondef(p.oid) ilike '%insert into public.profiles%'
    and pg_get_functiondef(p.oid) ilike '%raw_user_meta_data%';

  if v_trigger_count <> 1 or v_function_count <> 1 then
    raise exception 'Auth trigger/function baseline changed; re-review live Auth configuration';
  end if;
end;
$preflight$;

-- Private schema is not intended for PostgREST exposure.
create schema if not exists naren_private;
revoke all on schema naren_private from public, anon, authenticated;

create table public.referral_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.referral_settings(singleton, enabled) values (true, false);

create table public.customer_referral_codes (
  customer_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique
    check (code ~ '^NAREN-[0-9A-F]{24}$'),
  created_at timestamptz not null default now()
);

create table public.customer_referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_id uuid not null references public.customer_referral_codes(customer_id),
  referral_code text not null references public.customer_referral_codes(code),
  category text not null check (category in ('tenant','owner')),
  registered_at timestamptz not null default now(),
  constraint customer_referrals_no_self_referral
    check (referred_user_id <> referrer_id)
);

create index customer_referrals_referrer_created_idx
  on public.customer_referrals(referrer_id, registered_at desc);

alter table public.referral_settings enable row level security;
alter table public.customer_referral_codes enable row level security;
alter table public.customer_referrals enable row level security;

-- No direct table access from browser roles. All access is through the guarded RPC.
revoke all on public.referral_settings,
              public.customer_referral_codes,
              public.customer_referrals
  from public, anon, authenticated;

-- Customer dashboard RPC. It intentionally returns no referred user IDs or PII.
create or replace function public.customer_referral_dashboard()
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
    select 1
    from public.profiles p
    where p.id = v_actor and p.role = 'customer'
  ) then
    raise exception 'Customer authorization is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.referral_settings
    where singleton is true and enabled is true
  ) then
    raise exception 'Referral registration is unavailable'
      using errcode = '55000';
  end if;

  select c.code into v_code
  from public.customer_referral_codes c
  where c.customer_id = v_actor;

  if v_code is null then
    loop
      insert into public.customer_referral_codes(customer_id, code)
      values (
        v_actor,
        'NAREN-' || pg_catalog.upper(
          pg_catalog.substr(
            pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
            1, 24
          )
        )
      )
      on conflict do nothing;

      select c.code into v_code
      from public.customer_referral_codes c
      where c.customer_id = v_actor;

      exit when v_code is not null;
    end loop;
  end if;

  select
    count(*),
    count(*) filter (where r.category = 'tenant'),
    count(*) filter (where r.category = 'owner')
  into v_total, v_tenant, v_owner
  from public.customer_referrals r
  where r.referrer_id = v_actor;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'category', x.category,
        'registeredAt', x.registered_at
      )
      order by x.registered_at desc, x.referred_user_id desc
    ),
    '[]'::jsonb
  )
  into v_history
  from (
    select r.category, r.registered_at, r.referred_user_id
    from public.customer_referrals r
    where r.referrer_id = v_actor
    order by r.registered_at desc, r.referred_user_id desc
    limit 100
  ) x;

  return pg_catalog.jsonb_build_object(
    'code', v_code,
    'total', v_total,
    'tenants', v_tenant,
    'owners', v_owner,
    'history', v_history
  );
end;
$function$;

alter function public.customer_referral_dashboard() owner to postgres;
revoke all on function public.customer_referral_dashboard() from public, anon, authenticated;
grant execute on function public.customer_referral_dashboard() to authenticated;

-- Signup attribution trigger function lives in the non-exposed private schema.
-- It is deliberately independent of public.profiles because PostgreSQL fires
-- same-event triggers alphabetically; this trigger runs before on_auth_user_created.
create or replace function naren_private.capture_signup_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_code text := pg_catalog.upper(
    pg_catalog.btrim(
      coalesce(new.raw_user_meta_data ->> 'referral_code', '')
    )
  );
  v_category text := pg_catalog.lower(
    pg_catalog.btrim(
      coalesce(new.raw_user_meta_data ->> 'referral_category', '')
    )
  );
  v_referrer uuid;
begin
  if v_code = '' and v_category = '' then
    return new;
  end if;

  if v_code = '' or v_category = '' then
    raise exception 'Referral code and referral category must be supplied together'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.referral_settings
    where singleton is true and enabled is true
  ) then
    raise exception 'Referral registration is unavailable'
      using errcode = '55000';
  end if;

  if v_code !~ '^NAREN-[0-9A-F]{24}$'
     or v_category not in ('tenant','owner') then
    raise exception 'Invalid referral information'
      using errcode = '22023';
  end if;

  -- Category records the referral path selected by the referred person.
  -- Owner signups first create a Customer profile and may activate Owner capability
  -- later through the existing owner-activation workflow, so do not infer it from
  -- profiles.role or user metadata at Auth user creation time.
  select c.customer_id into v_referrer
  from public.customer_referral_codes c
  join public.profiles p on p.id = c.customer_id and p.role = 'customer'
  where c.code = v_code;

  if v_referrer is null or v_referrer = new.id then
    raise exception 'Invalid referral information'
      using errcode = '22023';
  end if;

  insert into public.customer_referrals(
    referred_user_id, referrer_id, referral_code, category
  )
  values (new.id, v_referrer, v_code, v_category);

  return new;
end;
$function$;

alter function naren_private.capture_signup_referral() owner to postgres;
revoke all on function naren_private.capture_signup_referral() from public, anon, authenticated;

create trigger capture_signup_referral
  after insert on auth.users
  for each row
  execute function naren_private.capture_signup_referral();

commit;

-- Activation is intentionally NOT included. Keep referral_settings.enabled=false
-- until app integration, Auth trigger order, RLS, RPC grants, and signup tests pass.
