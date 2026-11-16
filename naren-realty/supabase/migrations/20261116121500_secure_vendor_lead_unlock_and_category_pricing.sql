begin;

alter table public.service_categories
  add column lead_unlock_price numeric(10,2) not null default 0
  check (lead_unlock_price >= 0 and lead_unlock_price <= 1000000);

alter table private.vendor_enquiry_contacts
  add column customer_name text,
  add column locality text,
  add column message text;

-- Preserve any existing enquiry details in the private contact store before masking public fields.
update private.vendor_enquiry_contacts c
set customer_name = e.customer_name,
    locality = e.locality,
    message = e.message
from public.vendor_enquiries e
where e.id = c.enquiry_id;

update public.vendor_enquiries
set customer_name = 'Locked lead',
    locality = 'Hidden until unlock',
    message = 'Requirement details are hidden until the lead is unlocked.';

create or replace function public.submit_vendor_enquiry(
  p_vendor_id uuid,
  p_customer_name text,
  p_mobile text,
  p_locality text,
  p_full_address text,
  p_message text,
  p_contact_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_enquiry_id uuid;
begin
  if v_user_id is null then raise exception 'Sign in is required.'; end if;
  if p_contact_consent is distinct from true then raise exception 'Contact-sharing consent is required.'; end if;
  if length(trim(coalesce(p_customer_name,''))) not between 2 and 120
    or length(trim(coalesce(p_mobile,''))) not between 10 and 13
    or length(trim(coalesce(p_locality,''))) not between 2 and 120
    or length(trim(coalesce(p_full_address,''))) not between 5 and 500
    or length(trim(coalesce(p_message,''))) not between 5 and 2000 then
    raise exception 'Please check the enquiry details.';
  end if;
  if not exists (select 1 from public.service_vendors v where v.id=p_vendor_id and v.active) then
    raise exception 'This service provider is not available.';
  end if;

  insert into public.vendor_enquiries(vendor_id,customer_id,customer_name,locality,message,contact_consent)
  values (p_vendor_id,v_user_id,'Locked lead','Hidden until unlock','Requirement details hidden until unlock.',true)
  returning id into v_enquiry_id;

  insert into private.vendor_enquiry_contacts(enquiry_id,customer_name,mobile,full_address,locality,message)
  values (v_enquiry_id,trim(p_customer_name),trim(p_mobile),trim(p_full_address),trim(p_locality),trim(p_message));

  return v_enquiry_id;
end;
$function$;

drop function if exists public.get_unlocked_vendor_lead_contact(uuid);
create function public.get_unlocked_vendor_lead_contact(p_enquiry_id uuid)
returns table(customer_name text, mobile text, full_address text, locality text, message text)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  return query
  select c.customer_name, c.mobile, c.full_address, c.locality, c.message
  from private.vendor_enquiry_contacts c
  join public.vendor_enquiries e on e.id=c.enquiry_id
  join public.service_vendors v on v.id=e.vendor_id
  where e.id=p_enquiry_id
    and e.payment_status='paid'
    and v.user_id=auth.uid()
    and v.active;
  if not found then raise exception 'Contact is locked or this lead is not assigned to your account.'; end if;
end;
$function$;

create or replace function public.admin_list_vendor_lead_contacts()
returns table(enquiry_id uuid, customer_name text, mobile text, full_address text, locality text, message text)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  if auth.uid() is null or public.is_admin() is not true then
    raise exception 'Admin authorization is required.';
  end if;
  return query
  select c.enquiry_id, c.customer_name, c.mobile, c.full_address, c.locality, c.message
  from private.vendor_enquiry_contacts c;
end;
$function$;

revoke all on function public.submit_vendor_enquiry(uuid,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.submit_vendor_enquiry(uuid,text,text,text,text,text,boolean) to authenticated;
revoke all on function public.get_unlocked_vendor_lead_contact(uuid) from public, anon;
grant execute on function public.get_unlocked_vendor_lead_contact(uuid) to authenticated;
revoke all on function public.admin_list_vendor_lead_contacts() from public, anon;
grant execute on function public.admin_list_vendor_lead_contacts() to authenticated;
grant update (lead_unlock_price) on public.service_categories to authenticated;

commit;