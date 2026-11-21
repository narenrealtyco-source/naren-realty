-- REVIEW ONLY. Do not apply without reviewing existing profile role protection,
-- public.is_admin(), effective grants, function ownership and all RLS policies.
begin;
create table public.property_requirements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id),
  purpose text not null check (purpose in ('Buy','Rent')),
  category text not null check (category in ('Flat','PG','Hostel','Airbnb','Short Stay')),
  location text not null check (char_length(btrim(location)) between 1 and 120),
  bedrooms smallint check (bedrooms between 1 and 5 and category = 'Flat'),
  min_budget numeric(14,2) check (min_budget > 0),
  max_budget numeric(14,2) check (max_budget > 0),
  move_in_date date,
  details text not null default '' check (char_length(details) <= 2000),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  phone text not null check (phone ~ '^([6-9][0-9]{9}|\+91[6-9][0-9]{9})$'),
  status text not null default 'New' check (status in ('New','Contacted','Closed')),
  created_at timestamptz not null default now(),
  check (purpose <> 'Buy' or category = 'Flat'),
  check (min_budget is null or max_budget is null or min_budget <= max_budget)
);
create table public.loan_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 120),
  active boolean not null default true
);
insert into public.loan_types (name) values
 ('Home Loan'), ('Loan Against Property (LAP)'), ('Plot / Land Loan'),
 ('Commercial Property Loan'), ('Construction Loan'), ('Home Loan Balance Transfer'),
 ('Home Loan Top-Up'), ('Personal Loan'), ('Business Loan'),
 ('Property Purchase Loan'), ('Other');
create table public.loan_requirements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id),
  customer_name text not null check (char_length(btrim(customer_name)) between 1 and 120),
  phone text not null check (phone ~ '^([6-9][0-9]{9}|\+91[6-9][0-9]{9})$'),
  email text not null default '' check (char_length(email) <= 254),
  loan_type_id uuid not null references public.loan_types(id),
  amount numeric(14,2) not null check (amount > 0),
  property_location text not null default '' check (char_length(property_location) <= 120),
  property_value numeric(14,2) check (property_value > 0),
  employment text not null check (employment in ('Salaried','Self-employed','Business','Other')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'New' check (status in ('New','Contacted','Documents Pending','Under Process','Approved','Rejected','Closed')),
  created_at timestamptz not null default now()
);
create table public.requirement_followups (
  kind text not null check (kind in ('match','loan')),
  requirement_id uuid not null,
  assigned_to uuid references public.profiles(id),
  remarks text not null default '' check (char_length(remarks) <= 2000),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (kind, requirement_id)
);
alter table public.property_requirements enable row level security;
alter table public.loan_types enable row level security;
alter table public.loan_requirements enable row level security;
alter table public.requirement_followups enable row level security;
revoke all on public.property_requirements, public.loan_types, public.loan_requirements, public.requirement_followups from public, anon, authenticated;
grant select on public.loan_types to anon, authenticated;
grant insert (name), update (name,active) on public.loan_types to authenticated;
grant select on public.property_requirements, public.loan_requirements, public.requirement_followups to authenticated;
grant insert (purpose,category,location,bedrooms,min_budget,max_budget,move_in_date,details,customer_name,phone) on public.property_requirements to authenticated;
grant update (status) on public.property_requirements to authenticated;
grant insert (customer_name,phone,email,loan_type_id,amount,property_location,property_value,employment,details) on public.loan_requirements to authenticated;
grant update (customer_name,phone,email,loan_type_id,amount,property_location,property_value,employment,details) on public.loan_requirements to authenticated;
create policy "Read active loan types" on public.loan_types for select to anon, authenticated using (active);
create policy "Admins read all loan types" on public.loan_types for select to authenticated using (public.is_admin());
create policy "Admins create loan types" on public.loan_types for insert to authenticated with check (public.is_admin());
create policy "Admins update loan types" on public.loan_types for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Read own property requirements" on public.property_requirements for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "Create own property requirements" on public.property_requirements for insert to authenticated with check (customer_id = auth.uid() and status = 'New');
create policy "Close own property requirements" on public.property_requirements for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid() and status = 'Closed');
create policy "Read own loan requirements" on public.loan_requirements for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy "Create own loan requirements" on public.loan_requirements for insert to authenticated with check (customer_id = auth.uid() and status = 'New' and exists (select 1 from public.loan_types t where t.id = loan_type_id and t.active));
create policy "Admins edit loan requirements" on public.loan_requirements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins read requirement followups" on public.requirement_followups for select to authenticated using (public.is_admin());

create function public.admin_update_requirement(p_kind text, p_id uuid, p_status text, p_remarks text, p_assigned_to uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or public.is_admin() is not true then raise exception 'Admin authorization required'; end if;
  if p_remarks is null or char_length(p_remarks) > 2000 then raise exception 'Invalid remarks'; end if;
  if p_kind = 'match' and p_status in ('New','Contacted','Closed') then
    update public.property_requirements set status = p_status where id = p_id;
  elsif p_kind = 'loan' and p_status in ('New','Contacted','Documents Pending','Under Process','Approved','Rejected','Closed') then
    update public.loan_requirements set status = p_status where id = p_id;
  else raise exception 'Invalid status'; end if;
  if not found then raise exception 'Requirement not found'; end if;
  insert into public.requirement_followups (kind,requirement_id,assigned_to,remarks,updated_by)
    values (p_kind,p_id,p_assigned_to,p_remarks,auth.uid())
    on conflict (kind,requirement_id) do update set assigned_to=excluded.assigned_to, remarks=excluded.remarks, updated_by=excluded.updated_by, updated_at=now();
end;
$$;
revoke all on function public.admin_update_requirement(text,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_update_requirement(text,uuid,text,text,uuid) to authenticated;
commit;
