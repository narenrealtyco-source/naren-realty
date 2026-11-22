create table if not exists public.event_commission_settlements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event_submissions(id) on delete cascade,
  organiser_id uuid not null references auth.users(id) on delete cascade,
  cycle_number integer not null check (cycle_number >= 1),
  cycle_start timestamptz not null,
  cycle_end timestamptz not null,
  total_ticket_sales numeric(12,2) not null default 0,
  commission_due numeric(12,2) not null default 0,
  sale_reports_count integer not null default 0,
  payment_reference text,
  payment_status text not null default 'pending' check (payment_status in ('pending','submitted','verified','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, cycle_number),
  check (cycle_end = cycle_start + interval '12 hours')
);
create index if not exists event_commission_settlements_organiser_cycle_idx on public.event_commission_settlements(organiser_id, cycle_start desc);
create index if not exists event_commission_settlements_status_idx on public.event_commission_settlements(payment_status, cycle_end);
alter table public.event_commission_settlements enable row level security;
create policy "Organisers can view their own settlement cycles" on public.event_commission_settlements for select to authenticated using (organiser_id = (select auth.uid()));
create policy "Admins can view all settlement cycles" on public.event_commission_settlements for select to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Organisers can submit settlement UTR once" on public.event_commission_settlements for update to authenticated using (organiser_id = (select auth.uid()) and payment_status = 'pending' and payment_reference is null) with check (organiser_id = (select auth.uid()) and payment_reference is not null and payment_status = 'submitted');
create policy "Admins can review settlement cycles" on public.event_commission_settlements for update to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create or replace function public.capture_event_commission_settlement_cycle() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_approved_at timestamptz; v_cycle integer; v_start timestamptz;
begin
 select e.reviewed_at into v_approved_at from public.event_submissions e where e.id = new.event_id and e.submitted_by = new.organiser_id and e.status = 'approved' and e.ticket_price > 0;
 if v_approved_at is null then raise exception 'Event must be approved before reporting paid ticket sales'; end if;
 v_cycle := floor(extract(epoch from (new.created_at - v_approved_at)) / 43200)::integer + 1;
 v_start := v_approved_at + ((v_cycle - 1) * interval '12 hours');
 insert into public.event_commission_settlements(event_id,organiser_id,cycle_number,cycle_start,cycle_end,total_ticket_sales,commission_due,sale_reports_count)
 values(new.event_id,new.organiser_id,v_cycle,v_start,v_start + interval '12 hours',new.total_ticket_amount,new.commission_amount,1)
 on conflict(event_id,cycle_number) do update set total_ticket_sales=public.event_commission_settlements.total_ticket_sales+excluded.total_ticket_sales, commission_due=public.event_commission_settlements.commission_due+excluded.commission_due, sale_reports_count=public.event_commission_settlements.sale_reports_count+1, updated_at=now();
 return new;
end; $$;
revoke all on function public.capture_event_commission_settlement_cycle() from public, anon, authenticated;
drop trigger if exists trg_capture_event_commission_settlement_cycle on public.event_ticket_sales;
create trigger trg_capture_event_commission_settlement_cycle after insert on public.event_ticket_sales for each row execute function public.capture_event_commission_settlement_cycle();
grant select, update on public.event_commission_settlements to authenticated;
