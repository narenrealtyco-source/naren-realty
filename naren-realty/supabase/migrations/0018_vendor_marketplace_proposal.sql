-- REVIEW ONLY. Do not apply until public.is_admin(), profile role protection,
-- existing grants and ownership are verified. No portfolio storage is provided.
begin;

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  active boolean not null default true
);
insert into public.service_categories (name, slug) values
 ('Electrician','electrician'), ('Key Maker / Locksmith','key-maker-locksmith'),
 ('Modular Kitchen','modular-kitchen'), ('Painting','painting'), ('Plumber','plumber'),
 ('Carpenter & Furniture','carpenter-furniture'), ('Home Cleaning','home-cleaning'),
 ('AC Repair & Service','ac-repair-service'), ('Appliance Repair','appliance-repair'),
 ('Civil Work','civil-work'), ('Waterproofing','waterproofing'), ('Pest Control','pest-control'),
 ('Packers & Movers','packers-movers'), ('Interior Designer','interior-designer'),
 ('Home Loan Assistance','home-loan-assistance'), ('Legal Services','legal-services'),
 ('Home Renovation','home-renovation'), ('Other Home Services','other-home-services');

create table public.service_vendor_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null default auth.uid() references public.profiles(id),
  category_id uuid not null references public.service_categories(id),
  business_name text not null check (char_length(btrim(business_name)) between 1 and 120),
  contact_person text not null check (char_length(btrim(contact_person)) between 1 and 120),
  public_name text not null check (char_length(btrim(public_name)) between 1 and 120),
  mobile text not null check (mobile ~ '^([6-9][0-9]{9}|\+91[6-9][0-9]{9})$'),
  email text not null default '' check (char_length(email) <= 254),
  services text not null check (char_length(btrim(services)) between 1 and 500),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  city text not null check (char_length(btrim(city)) between 1 and 100),
  locality text not null check (char_length(btrim(locality)) between 1 and 100),
  address text not null check (char_length(btrim(address)) between 1 and 500),
  commission_terms text not null default '' check (char_length(commission_terms) <= 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);
create unique index vendor_application_duplicate on public.service_vendor_applications
  (applicant_id, category_id, lower(btrim(business_name)));

-- Only deliberately public fields are copied here; contact, address and terms
-- never become available through the public directory.
create table public.service_vendors (
  id uuid primary key references public.service_vendor_applications(id),
  category_id uuid not null references public.service_categories(id),
  business_name text not null,
  public_name text not null,
  services text not null,
  description text not null,
  city text not null,
  locality text not null,
  active boolean not null default true
);

create table public.vendor_enquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id),
  vendor_id uuid not null references public.service_vendors(id),
  category_id uuid not null references public.service_categories(id),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  mobile text not null check (mobile ~ '^([6-9][0-9]{9}|\+91[6-9][0-9]{9})$'),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending','contacted','completed','cancelled')),
  created_at timestamptz not null default now()
);
create table public.vendor_enquiry_followups (
  enquiry_id uuid primary key references public.vendor_enquiries(id),
  remarks text not null check (char_length(remarks) <= 2000),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table public.service_vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.service_vendor_applications(id),
  reviewer_id uuid not null references public.profiles(id),
  action text not null check (action in ('approve','reject','activate','deactivate','edit')),
  commission_terms text not null check (char_length(commission_terms) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.service_categories enable row level security;
alter table public.service_vendor_applications enable row level security;
alter table public.service_vendors enable row level security;
alter table public.vendor_enquiries enable row level security;
alter table public.vendor_enquiry_followups enable row level security;
alter table public.service_vendor_reviews enable row level security;
revoke all on public.service_categories, public.service_vendor_applications, public.service_vendors, public.vendor_enquiries, public.service_vendor_reviews, public.vendor_enquiry_followups from public, anon, authenticated;
grant select on public.service_categories, public.service_vendors to anon, authenticated;
grant insert (name,slug), update (name,active), delete on public.service_categories to authenticated;
grant select on public.service_vendor_applications, public.vendor_enquiries to authenticated;
grant select on public.service_vendor_reviews to authenticated;
grant select on public.vendor_enquiry_followups to authenticated;
grant insert (category_id,business_name,contact_person,public_name,mobile,email,services,description,city,locality,address,commission_terms) on public.service_vendor_applications to authenticated;
grant insert (vendor_id,customer_name,mobile,message) on public.vendor_enquiries to authenticated;
grant update (status) on public.vendor_enquiries to authenticated;

create policy "Public reads active service categories" on public.service_categories for select to anon, authenticated using (active);
create policy "Admins read all service categories" on public.service_categories for select to authenticated using (public.is_admin());
create policy "Admins create service categories" on public.service_categories for insert to authenticated with check (public.is_admin());
create policy "Admins update service categories" on public.service_categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete service categories" on public.service_categories for delete to authenticated using (public.is_admin());
create policy "Applicants and admins read applications" on public.service_vendor_applications for select to authenticated using (applicant_id = auth.uid() or public.is_admin());
create policy "Users submit their application" on public.service_vendor_applications for insert to authenticated with check (
  applicant_id = auth.uid() and status = 'pending' and
  exists (select 1 from public.service_categories c where c.id = category_id and c.active)
);
create policy "Public reads active vendors" on public.service_vendors for select to anon, authenticated using (
  active and exists (select 1 from public.service_categories c where c.id = category_id and c.active)
);
create policy "Admins read all vendors" on public.service_vendors for select to authenticated using (public.is_admin());
create policy "Customers and admins read vendor enquiries" on public.vendor_enquiries for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "Customers submit vendor enquiries" on public.vendor_enquiries for insert to authenticated with check (
  customer_id = auth.uid() and status = 'pending' and
  exists (select 1 from public.service_vendors v join public.service_categories c on c.id = v.category_id where v.id = vendor_id and v.active and c.active)
);
create policy "Admins update vendor enquiries" on public.vendor_enquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read vendor reviews" on public.service_vendor_reviews for select to authenticated using (public.is_admin());
create policy "Admins read vendor enquiry followups" on public.vendor_enquiry_followups for select to authenticated using (public.is_admin());

create function public.vendor_enquiry_category_snapshot()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  select category_id into new.category_id from public.service_vendors where id = new.vendor_id and active;
  if new.category_id is null then raise exception 'Provider unavailable'; end if;
  return new;
end;
$$;
revoke all on function public.vendor_enquiry_category_snapshot() from public, anon, authenticated;
create trigger vendor_enquiry_category_before_insert before insert on public.vendor_enquiries
for each row execute function public.vendor_enquiry_category_snapshot();

create function public.admin_update_vendor_enquiry(p_id uuid, p_status text, p_remarks text)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or public.is_admin() is not true then raise exception 'Admin authorization required'; end if;
  if p_status is null or p_status not in ('pending','contacted','completed','cancelled') or p_remarks is null or char_length(p_remarks) > 2000 then raise exception 'Invalid enquiry update'; end if;
  update public.vendor_enquiries set status = p_status where id = p_id;
  if not found then raise exception 'Enquiry not found'; end if;
  insert into public.vendor_enquiry_followups(enquiry_id,remarks,updated_by) values (p_id,p_remarks,auth.uid())
    on conflict (enquiry_id) do update set remarks = excluded.remarks, updated_by = excluded.updated_by, updated_at = now();
end;
$$;
revoke all on function public.admin_update_vendor_enquiry(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_update_vendor_enquiry(uuid,text,text) to authenticated;

create function public.review_service_vendor(p_id uuid, p_action text, p_terms text)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare application public.service_vendor_applications%rowtype;
begin
  if auth.uid() is null or public.is_admin() is not true then raise exception 'Admin authorization required'; end if;
  if p_action is null or p_action not in ('approve','reject','activate','deactivate') or p_terms is null or char_length(p_terms) > 1000 then raise exception 'Invalid review'; end if;
  select * into application from public.service_vendor_applications where id = p_id for update;
  if not found then raise exception 'Application not found'; end if;
  if p_action in ('activate','deactivate') and application.status <> 'approved' then raise exception 'Vendor is not approved'; end if;
  if p_action = 'approve' then
    update public.service_vendor_applications set status = 'approved', commission_terms = p_terms, reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
    insert into public.service_vendors (id,category_id,business_name,public_name,services,description,city,locality,active)
      values (application.id,application.category_id,application.business_name,application.public_name,application.services,application.description,application.city,application.locality,true)
      on conflict (id) do update set category_id = excluded.category_id, business_name = excluded.business_name, public_name = excluded.public_name, services = excluded.services, description = excluded.description, city = excluded.city, locality = excluded.locality, active = true;
  elsif p_action = 'reject' then
    update public.service_vendor_applications set status = 'rejected', commission_terms = p_terms, reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
    update public.service_vendors set active = false where id = p_id;
  else
    update public.service_vendor_applications set commission_terms = p_terms, reviewed_at = now(), reviewed_by = auth.uid() where id = p_id;
    update public.service_vendors set active = (p_action = 'activate') where id = p_id;
    if not found then raise exception 'Published vendor not found'; end if;
  end if;
  insert into public.service_vendor_reviews (application_id, reviewer_id, action, commission_terms) values (p_id, auth.uid(), p_action, p_terms);
end;
$$;
revoke all on function public.review_service_vendor(uuid,text,text) from public, anon, authenticated;
grant execute on function public.review_service_vendor(uuid,text,text) to authenticated;

create function public.admin_edit_service_vendor(p_id uuid, p_data jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare application public.service_vendor_applications%rowtype;
begin
  if auth.uid() is null or public.is_admin() is not true then raise exception 'Admin authorization required'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'Invalid vendor data'; end if;
  select * into application from public.service_vendor_applications where id = p_id for update;
  if not found then raise exception 'Application not found'; end if;
  update public.service_vendor_applications set
    category_id = (p_data->>'category_id')::uuid,
    business_name = p_data->>'business_name', public_name = p_data->>'public_name',
    contact_person = p_data->>'contact_person', mobile = p_data->>'mobile', email = p_data->>'email',
    services = p_data->>'services', description = p_data->>'description',
    city = p_data->>'city', locality = p_data->>'locality', address = p_data->>'address',
    commission_terms = p_data->>'commission_terms', reviewed_at = now(), reviewed_by = auth.uid()
    where id = p_id returning * into application;
  update public.service_vendors set category_id = application.category_id, business_name = application.business_name,
    public_name = application.public_name, services = application.services, description = application.description,
    city = application.city, locality = application.locality where id = p_id;
  insert into public.service_vendor_reviews (application_id,reviewer_id,action,commission_terms)
    values (p_id,auth.uid(),'edit',application.commission_terms);
end;
$$;
revoke all on function public.admin_edit_service_vendor(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.admin_edit_service_vendor(uuid,jsonb) to authenticated;
commit;
