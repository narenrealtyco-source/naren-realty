-- Separate verified approval from reward trigger, which unlocks the customer claim.
alter table public.referral_attributions
 add column if not exists reward_triggered_at timestamptz,
 add column if not exists reward_triggered_by uuid references public.profiles(id);
drop policy if exists "claimants submit own triggered claims" on public.referral_reward_claims;
create policy "claimants submit own triggered claims" on public.referral_reward_claims for insert to authenticated
with check (
 user_id = (select auth.uid())
 and exists (
  select 1 from public.referral_attributions r
  where r.id=referral_id and r.referred_user_id=(select auth.uid())
    and r.status='approved' and r.reward_triggered_at is not null
 )
);
