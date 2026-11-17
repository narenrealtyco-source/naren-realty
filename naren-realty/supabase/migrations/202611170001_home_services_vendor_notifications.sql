-- Home Services vendor lead workflow, in-app notifications, and PWA service worker.
-- Applied to the connected Supabase project and verified separately.
begin;

alter table public.vendor_enquiries drop column if exists customer_phone;
revoke insert on public.vendor_enquiries from authenticated;

drop policy if exists "Customers and assigned vendors can read enquiries" on public.vendor_enquiries;
drop policy if exists "Customers and admins can read vendor enquiries" on public.vendor_enquiries;
create policy "Customers and admins can read vendor enquiries"
on public.vendor_enquiries for select to authenticated
using (customer_id = (select auth.uid()) or (select is_admin()));

revoke insert on public.vendor_enquiries from authenticated;

create or replace function public.get_vendor_enquiries()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required.'; end if;
  if not exists (select 1 from public.service_vendors where user_id = auth.uid() and active is true) then
    raise exception 'An active approved service partner account is required.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'customer_name', e.customer_name,
    'locality', e.locality,
    'message', e.message,
    'status', e.status,
    'payment_status', e.payment_status,
    'created_at', e.created_at
  ) order by e.created_at desc), '[]'::jsonb)
  into v_result
  from public.vendor_enquiries e
  where e.vendor_id in (select id from public.service_vendors where user_id = auth.uid() and active is true);
  return v_result;
end;
$$;

create or replace function public.get_unlocked_vendor_lead_contact(p_enquiry_id uuid)
returns table(mobile text, full_address text)
language plpgsql security definer set search_path = pg_catalog, public, private
as $
begin
  if auth.uid() is null then raise exception 'Sign in is required.'; end if;
  return query
  select c.mobile, c.full_address
  from private.vendor_enquiry_contacts c
  join public.vendor_enquiries e on e.id = c.enquiry_id
  join public.service_vendors v on v.id = e.vendor_id
  where e.id = p_enquiry_id
    and e.payment_status in ('paid','waived')
    and v.user_id = auth.uid()
    and v.active;
  if not found then raise exception 'Contact is locked or this lead is not assigned to your account.'; end if;
end;
$;

create or replace function public.vendor_respond_to_enquiry(p_enquiry_id uuid, p_decision text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_vendor_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required.'; end if;
  if p_decision not in ('accept','decline') then raise exception 'Choose accept or decline.'; end if;
  select v.id into v_vendor_id
  from public.vendor_enquiries e
  join public.service_vendors v on v.id = e.vendor_id
  where e.id = p_enquiry_id and v.user_id = auth.uid() and v.active is true
  for update of e;
  if v_vendor_id is null then raise exception 'This lead is no longer available.'; end if;
  update public.vendor_enquiries
  set status = case when p_decision = 'accept' then 'contacted' else 'cancelled' end
  where id = p_enquiry_id and vendor_id = v_vendor_id and status = 'new';
  if not found then raise exception 'This lead is no longer available.'; end if;
  return true;
end;
$$;

create or replace function public.notification_user_vendor_lead()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_vendor_user_id uuid;
begin
  select user_id into v_vendor_user_id from public.service_vendors where id = new.vendor_id and active is true;
  if v_vendor_user_id is not null then
    perform public.notify_user(v_vendor_user_id,'vendor_new_lead','New Service Lead – Swipe to Accept',
      'A new customer service lead is available. Open your vendor dashboard to review and accept it.',
      '/services/vendor/dashboard');
  end if;
  return new;
end;
$$;

create or replace function public.notification_user_vendor_application()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_user(new.user_id,'vendor_application_received','Vendor application received',
      'Your service partner registration has been received and is under review.','/home-services/register');
  elsif new.status is distinct from old.status then
    perform public.notify_user(new.user_id,'vendor_application_status','Vendor application update',
      'Your service partner application status is now: ' || new.status || '.','/services/vendor/dashboard');
  end if;
  return new;
end;
$$;

create or replace function public.notification_user_customer_request()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_title text; v_body text; v_url text;
begin
  if tg_table_name = 'property_requirements' then
    v_title := 'Requirement submitted'; v_body := 'Your property requirement has been received.'; v_url := '/matches';
    perform public.notify_user(new.customer_id,'requirement_received',v_title,v_body,v_url);
  elsif tg_table_name = 'enquiries' then
    perform public.notify_user(new.customer_id,'enquiry_received','Enquiry submitted','Your property enquiry has been received. Our team will contact you.','/account/enquiries');
  elsif tg_table_name = 'visit_requests' then
    perform public.notify_user(new.customer_id,'visit_requested','Site visit requested','Your property visit request has been received.','/account/visits');
  elsif tg_table_name = 'loan_requirements' then
    perform public.notify_user(new.customer_id,'loan_received','Loan requirement submitted','Your loan requirement has been received. Our team will contact you.','/loans');
  elsif tg_table_name = 'home_service_enquiries' then
    perform public.notify_user(new.customer_id,'home_service_received','Service request submitted','Your home service request has been received.','/home-services');
  end if;
  return new;
end;
$$;

create or replace function public.notification_user_vendor_payment()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $
declare v_vendor_user_id uuid;
begin
  if new.payment_status is distinct from old.payment_status
     and lower(coalesce(new.payment_status,'')) in ('paid','completed') then
    select user_id into v_vendor_user_id
    from public.service_vendors where id = new.vendor_id and active is true;
    if v_vendor_user_id is not null then
      perform public.notify_user(v_vendor_user_id,'vendor_lead_payment','Lead payment confirmed',
        'Payment for your service lead has been confirmed.','/services/vendor/dashboard');
    end if;
  end if;
  return new;
end;
$;

create or replace function public.notification_on_vendor_enquiry_update()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    perform public.notify_user(new.customer_id,'vendor_enquiry_status','Service enquiry update',
      case when new.status = 'contacted' then 'A service provider has accepted your enquiry and will contact you.'
           when new.status = 'cancelled' then 'The service provider could not take this enquiry. NAREN REALTY can help you find another provider.'
           else 'Your service enquiry status is now ' || new.status || '.' end,
      '/home-services');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_user_vendor_enquiry_update on public.vendor_enquiries;
create trigger trg_notify_user_vendor_enquiry_update
after update of status on public.vendor_enquiries
for each row execute function public.notification_on_vendor_enquiry_update();

create or replace function public.notification_on_vendor_application()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  perform public.notify_admins('new_vendor_application','New service partner application',
    new.business_name || ' submitted a service partner application.',
    '/admin/services/vendors');
  return new;
end;
$$;

drop trigger if exists trg_notify_admin_vendor_application on public.service_vendor_applications;
create trigger trg_notify_admin_vendor_application
after insert on public.service_vendor_applications
for each row execute function public.notification_on_vendor_application();

create or replace function public.notification_on_home_service_status_update()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if new.status is distinct from old.status then
    perform public.notify_user(new.customer_id,'home_service_status','Home service request update',
      'Your home service request status is now: ' || new.status || '.','/home-services');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_user_home_service_status on public.home_service_enquiries;
create trigger trg_notify_user_home_service_status
after update of status on public.home_service_enquiries
for each row execute function public.notification_on_home_service_status_update();

revoke insert, delete, truncate, references, trigger on public.notifications from authenticated;
grant select, update on public.notifications to authenticated;

revoke all on function public.get_vendor_enquiries() from public, anon;
revoke all on function public.vendor_respond_to_enquiry(uuid,text) from public, anon;
grant execute on function public.get_vendor_enquiries() to authenticated;
grant execute on function public.vendor_respond_to_enquiry(uuid,text) to authenticated;

revoke all on function public.notify_user(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.notify_admins(text,text,text,text) from public, anon, authenticated;
revoke all on function public.notification_on_vendor_enquiry_update() from public, anon, authenticated;
revoke all on function public.notification_on_vendor_application() from public, anon, authenticated;
revoke all on function public.notification_on_home_service_status_update() from public, anon, authenticated;
revoke all on function public.notification_user_vendor_payment() from public, anon, authenticated;
revoke all on function public.submit_vendor_enquiry(uuid,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.submit_vendor_enquiry(uuid,text,text,text,text,text,boolean) to authenticated;
revoke all on function public.get_unlocked_vendor_lead_contact(uuid) from public, anon;
grant execute on function public.get_unlocked_vendor_lead_contact(uuid) to authenticated;

commit;
