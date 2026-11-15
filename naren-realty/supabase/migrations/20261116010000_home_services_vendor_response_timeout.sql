-- Home Services: explicit vendor response window and customer alternatives.
-- Payment fields and payment workflows are intentionally unchanged.

alter table public.vendor_enquiries
  add column if not exists response_deadline_at timestamptz,
  add column if not exists vendor_responded_at timestamptz;

alter table public.vendor_enquiries
  drop constraint if exists vendor_enquiries_status_check;

alter table public.vendor_enquiries
  add constraint vendor_enquiries_status_check
  check (status = any (array['new','contacted','closed','cancelled','accepted','declined','not_accepted']));

-- Backfill a deadline for existing open enquiries without changing their current state.
update public.vendor_enquiries
set response_deadline_at = created_at + interval '60 seconds'
where response_deadline_at is null and status = 'new';

create index if not exists vendor_enquiries_vendor_status_deadline_idx
  on public.vendor_enquiries (vendor_id, status, response_deadline_at);
create index if not exists vendor_enquiries_customer_created_idx
  on public.vendor_enquiries (customer_id, created_at desc);

create or replace function public.submit_vendor_enquiry(
  p_vendor_id uuid,
  p_customer_name text,
  p_mobile text,
  p_locality text,
  p_full_address text,
  p_message text,
  p_contact_consent boolean
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
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
  if not exists (
    select 1 from public.service_vendors v
    join public.service_categories c on c.id=v.category_id
    where v.id=p_vendor_id and v.active and v.verified and c.active
  ) then raise exception 'This verified service provider is not available.'; end if;

  insert into public.vendor_enquiries(
    vendor_id, customer_id, customer_name, locality, message, contact_consent,
    status, response_deadline_at
  )
  values (
    p_vendor_id, v_user_id, trim(p_customer_name), trim(p_locality), trim(p_message), true,
    'new', now() + interval '60 seconds'
  )
  returning id into v_enquiry_id;

  insert into private.vendor_enquiry_contacts(enquiry_id,mobile,full_address)
  values (v_enquiry_id,trim(p_mobile),trim(p_full_address));
  return v_enquiry_id;
end;
$$;

create or replace function public.respond_to_vendor_enquiry(p_enquiry_id uuid, p_decision text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  if p_decision is null or p_decision not in ('accept','decline') then raise exception 'Invalid response.'; end if;

  update public.vendor_enquiries e
  set status = case when p_decision='accept' then 'accepted' else 'declined' end,
      vendor_responded_at = now()
  from public.service_vendors v
  where e.id=p_enquiry_id
    and e.vendor_id=v.id
    and v.user_id=auth.uid()
    and v.active
    and e.status='new'
    and e.response_deadline_at > now()
  returning e.status into v_status;

  if v_status is not null then return v_status; end if;

  update public.vendor_enquiries e
  set status='not_accepted'
  from public.service_vendors v
  where e.id=p_enquiry_id
    and e.vendor_id=v.id
    and v.user_id=auth.uid()
    and e.status='new'
    and e.response_deadline_at <= now();

  select e.status into v_status
  from public.vendor_enquiries e
  join public.service_vendors v on v.id=e.vendor_id
  where e.id=p_enquiry_id and v.user_id=auth.uid();

  if v_status='not_accepted' then return v_status; end if;
  if v_status is null then raise exception 'Request not found for your vendor account.'; end if;
  raise exception 'This request has already been responded to.';
end;
$$;

create or replace function public.get_customer_vendor_enquiry_status(p_enquiry_id uuid)
returns table(enquiry_id uuid, status text, response_deadline_at timestamptz, vendor_id uuid, category_id uuid, locality text, city text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;

  update public.vendor_enquiries e
  set status='not_accepted'
  where e.id=p_enquiry_id and e.customer_id=auth.uid()
    and e.status='new' and e.response_deadline_at <= now();

  return query
  select e.id,e.status,e.response_deadline_at,e.vendor_id,v.category_id,e.locality,v.city
  from public.vendor_enquiries e
  join public.service_vendors v on v.id=e.vendor_id
  where e.id=p_enquiry_id and e.customer_id=auth.uid();
end;
$$;

create or replace function public.get_vendor_pending_enquiries()
returns table(
  id uuid, customer_name text, locality text, message text,
  status text, created_at timestamptz, response_deadline_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;

  update public.vendor_enquiries e
  set status='not_accepted'
  from public.service_vendors v
  where e.vendor_id=v.id and v.user_id=auth.uid()
    and e.status='new' and e.response_deadline_at <= now();

  return query
  select e.id,e.customer_name,e.locality,e.message,e.status,e.created_at,e.response_deadline_at
  from public.vendor_enquiries e
  join public.service_vendors v on v.id=e.vendor_id
  where v.user_id=auth.uid() and v.active
    and e.created_at > now() - interval '30 days'
  order by e.created_at desc
  limit 100;
end;
$$;

revoke all on function public.respond_to_vendor_enquiry(uuid,text) from public, anon;
grant execute on function public.respond_to_vendor_enquiry(uuid,text) to authenticated;
revoke all on function public.get_customer_vendor_enquiry_status(uuid) from public, anon;
grant execute on function public.get_customer_vendor_enquiry_status(uuid) to authenticated;
revoke all on function public.get_vendor_pending_enquiries() from public, anon;
grant execute on function public.get_vendor_pending_enquiries() to authenticated;
revoke all on function public.submit_vendor_enquiry(uuid,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.submit_vendor_enquiry(uuid,text,text,text,text,text,boolean) to authenticated;
