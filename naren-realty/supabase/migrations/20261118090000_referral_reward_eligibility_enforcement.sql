-- Referral reward eligibility enforcement. Applied to Supabase project eyvyszvvujvytdvppaoj.
begin;

alter table public.referral_attributions
  add column if not exists property_id uuid references public.properties(id),
  add column if not exists transaction_type text,
  add column if not exists deal_source text,
  add column if not exists deal_completed_at timestamptz,
  add column if not exists rental_agreement_executed boolean not null default false;

alter table public.referral_attributions
  drop constraint if exists referral_attributions_transaction_type_check,
  add constraint referral_attributions_transaction_type_check
    check (transaction_type is null or transaction_type in ('rental','resale')),
  drop constraint if exists referral_attributions_deal_source_check,
  add constraint referral_attributions_deal_source_check
    check (deal_source is null or deal_source in ('naren_realty','direct_owner','other_broker','market'));

create index if not exists referral_attributions_property_idx
  on public.referral_attributions(property_id) where property_id is not null;

create or replace function public.enforce_referral_reward_eligibility()
returns trigger language plpgsql set search_path = pg_catalog, public
as $function$
begin
  if new.status in ('eligible','approved','paid') then
    if new.deal_source is distinct from 'naren_realty' then
      raise exception 'Referral reward is blocked: transaction was not completed through NAREN REALTY' using errcode = '23514';
    end if;
    if new.property_id is null or new.transaction_type is null or new.deal_completed_at is null
       or new.verified_by is null or new.verified_at is null then
      raise exception 'Referral reward requires a linked property, deal type, completion date and Admin verification' using errcode = '23514';
    end if;
    if new.referral_type = 'tenant' then
      if new.transaction_type <> 'rental' or new.rental_agreement_executed is not true then
        raise exception 'Tenant referral reward requires a completed rental and executed Rent / Leave & License Agreement' using errcode = '23514';
      end if;
      if not exists (
        select 1 from public.enquiries e where e.customer_id=new.referred_user_id and e.property_id=new.property_id
        union all
        select 1 from public.visit_requests v where v.customer_id=new.referred_user_id and v.property_id=new.property_id
      ) then
        raise exception 'Tenant referral reward requires a same-property NAREN REALTY enquiry or visit' using errcode = '23514';
      end if;
    elsif new.referral_type = 'owner' then
      if not exists (
        select 1 from public.properties p
        where p.id=new.property_id and p.owner_id=new.referred_user_id and p.status='approved'
      ) then
        raise exception 'Owner referral reward requires the referred owner''s approved NAREN REALTY listing' using errcode = '23514';
      end if;
    end if;
  end if;
  if new.status = 'paid' and (new.paid_by is null or new.paid_at is null or nullif(btrim(new.payment_reference),'') is null) then
    raise exception 'Paid referral rewards require Admin, payment date and payment reference' using errcode = '23514';
  end if;
  return new;
end;
$function$;

drop trigger if exists enforce_referral_reward_eligibility on public.referral_attributions;
create trigger enforce_referral_reward_eligibility
before insert or update on public.referral_attributions
for each row execute function public.enforce_referral_reward_eligibility();

comment on column public.referral_attributions.deal_source is 'Only naren_realty transactions can qualify for a referral reward.';
comment on column public.referral_attributions.rental_agreement_executed is 'Admin attestation of agreement execution; not conclusive legal proof.';

commit;
