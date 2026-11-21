-- Tighten reward lifecycle and require source evidence created after referral registration.
create or replace function public.enforce_referral_reward_eligibility()
returns trigger language plpgsql set search_path = pg_catalog, public
as $function$
begin
  if tg_op='UPDATE' and old.status='paid' and new.status<>'paid' then
    raise exception 'A paid referral reward cannot be reopened or reversed' using errcode='23514';
  end if;
  if new.status='approved' and (tg_op<>'UPDATE' or old.status<>'eligible') then
    raise exception 'A referral must be verified eligible before Admin approval' using errcode='23514';
  end if;
  if new.status='paid' and (tg_op<>'UPDATE' or old.status<>'approved') then
    raise exception 'A referral must be Admin-approved before it can be marked paid' using errcode='23514';
  end if;
  if new.status in ('eligible','approved','paid') then
    if new.deal_source is distinct from 'naren_realty' then
      raise exception 'Referral reward is blocked: transaction was not completed through NAREN REALTY' using errcode='23514';
    end if;
    if new.property_id is null or new.transaction_type is null or new.deal_completed_at is null
       or new.verified_by is null or new.verified_at is null
       or nullif(btrim(new.evidence_notes),'') is null then
      raise exception 'Referral reward requires linked property, deal type, completion date, Admin verification and evidence notes' using errcode='23514';
    end if;
    if new.referral_type='tenant' then
      if new.transaction_type<>'rental' or new.rental_agreement_executed is not true then
        raise exception 'Tenant reward requires rental and executed Rent / Leave & License Agreement' using errcode='23514';
      end if;
      if not exists (
        select 1 from public.enquiries e where e.customer_id=new.referred_user_id and e.property_id=new.property_id
          and e.created_at >= (select ra.created_at from public.referral_attributions ra where ra.id=new.id)
        union all
        select 1 from public.visit_requests v where v.customer_id=new.referred_user_id and v.property_id=new.property_id
          and v.created_at >= (select ra.created_at from public.referral_attributions ra where ra.id=new.id)
      ) then
        raise exception 'Tenant reward requires same-property NAREN REALTY enquiry or visit after referral registration' using errcode='23514';
      end if;
    elsif new.referral_type='owner' then
      if not exists (
        select 1 from public.properties p where p.id=new.property_id
          and p.owner_id=new.referred_user_id and p.status='approved'
          and p.created_at >= (select ra.created_at from public.referral_attributions ra where ra.id=new.id)
      ) then
        raise exception 'Owner reward requires referred owner approved listing created after referral registration' using errcode='23514';
      end if;
    end if;
  end if;
  if new.status='paid' and (new.paid_by is null or new.paid_at is null or nullif(btrim(new.payment_reference),'') is null) then
    raise exception 'Paid reward requires Admin, payment date and payment reference' using errcode='23514';
  end if;
  return new;
end;
$function$;
