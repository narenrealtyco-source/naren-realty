-- Personal UPI settlement: attendees pay organisers directly; organisers remit the 10% commission separately.
alter table public.event_ticket_sales
  drop constraint if exists event_ticket_sales_collection_method_check;

alter table public.event_ticket_sales
  add constraint event_ticket_sales_collection_method_check
  check (collection_method in ('upi', 'bank_transfer'));

update public.event_commission_settings
set payment_upi_id = 'naren.me@ptaxis',
    updated_at = now()
where id = true;
