-- Store organiser-specific attendee payment details separately from NAREN REALTY commission settings.
alter table public.event_submissions
  add column if not exists organiser_upi_id text,
  add column if not exists organiser_payee_name text,
  add column if not exists organiser_qr_image_url text;

create or replace function public.update_own_event_payment_details(
  p_event_id uuid,
  p_organiser_upi_id text,
  p_organiser_payee_name text default null,
  p_organiser_qr_image_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(coalesce(p_organiser_upi_id, '')), '') is null
     or length(trim(p_organiser_upi_id)) > 255
     or trim(p_organiser_upi_id) !~ '^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9.-]{2,64}$' then
    raise exception 'Enter a valid UPI ID';
  end if;

  if length(coalesce(p_organiser_payee_name, '')) > 120 then
    raise exception 'Payee name must be 120 characters or fewer';
  end if;

  if p_organiser_qr_image_url is not null
     and position('/storage/v1/object/public/event-images/' || v_user_id::text || '/payment-qr/' in p_organiser_qr_image_url) = 0 then
    raise exception 'QR image must be uploaded to your own event payment folder';
  end if;

  update public.event_submissions
     set organiser_upi_id = trim(p_organiser_upi_id),
         organiser_payee_name = nullif(trim(coalesce(p_organiser_payee_name, '')), ''),
         organiser_qr_image_url = nullif(trim(coalesce(p_organiser_qr_image_url, '')), ''),
         updated_at = now()
   where id = p_event_id
     and submitted_by = v_user_id;

  if not found then
    raise exception 'Event not found or you do not have permission to edit it';
  end if;
end;
$$;

revoke all on function public.update_own_event_payment_details(uuid,text,text,text) from public;
grant execute on function public.update_own_event_payment_details(uuid,text,text,text) to authenticated;
