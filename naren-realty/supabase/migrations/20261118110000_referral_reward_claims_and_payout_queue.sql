-- Secure reward claim and manual payout queue for referral rewards.
create table if not exists public.referral_reward_claims (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.referral_attributions(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  account_holder_name text not null check (char_length(btrim(account_holder_name)) between 2 and 120),
  bank_name text not null check (char_length(btrim(bank_name)) between 2 and 120),
  account_number text not null check (account_number ~ '^[0-9]{6,24}$'),
  ifsc text not null check (ifsc ~* '^[A-Z]{4}0[A-Z0-9]{6}$'),
  upi_id text check (upi_id is null or char_length(btrim(upi_id)) between 3 and 120),
  status text not null default 'waiting' check (status in ('waiting','paid')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  paid_at timestamptz,
  payment_mode text check (payment_mode is null or payment_mode in ('bank_transfer','upi')),
  payment_reference text,
  payment_remarks text,
  constraint referral_claim_paid_fields check (
    (status <> 'paid') or
    (paid_at is not null and reviewed_by is not null and payment_mode is not null and length(btrim(coalesce(payment_reference,''))) > 0)
  )
);
create index if not exists referral_reward_claims_user_status_idx on public.referral_reward_claims(user_id,status,submitted_at desc);
alter table public.referral_reward_claims enable row level security;
revoke all on public.referral_reward_claims from anon;
grant select,insert,update on public.referral_reward_claims to authenticated;
drop policy if exists "claimants read own referral claims" on public.referral_reward_claims;
create policy "claimants read own referral claims" on public.referral_reward_claims for select to authenticated
using (user_id = (select auth.uid()) or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists "claimants submit own triggered claims" on public.referral_reward_claims;
create policy "claimants submit own triggered claims" on public.referral_reward_claims for insert to authenticated
with check (
 user_id = (select auth.uid())
 and exists (
  select 1 from public.referral_attributions r
  where r.id=referral_id and r.referred_user_id=(select auth.uid()) and r.status='approved'
 )
);
drop policy if exists "admins update referral claims" on public.referral_reward_claims;
create policy "admins update referral claims" on public.referral_reward_claims for update to authenticated
using (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
