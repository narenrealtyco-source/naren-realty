create or replace function public.update_own_event_content(
  p_event_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_description text,
  p_ticket_price numeric,
  p_image_url text,
  p_banner_image_url text,
  p_total_capacity integer,
  p_available_seats integer,
  p_event_policies text,
  p_venue text,
  p_locality text,
  p_venue_address text,
  p_map_link text,
  p_online_event_link text,
  p_location_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_details jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if length(trim(coalesce(p_title, ''))) < 3 or length(trim(p_title)) > 120 then
    raise exception 'Event title must be between 3 and 120 characters';
  end if;
  if p_starts_at is null or (p_ends_at is not null and p_ends_at <= p_starts_at) then
    raise exception 'Invalid event start or end time';
  end if;
  if p_ticket_price is null or p_ticket_price < 1 or p_ticket_price > 10000000 then
    raise exception 'Ticket price must be between 1 and 10000000';
  end if;
  if p_total_capacity is null or p_total_capacity < 1 or p_total_capacity > 100000
     or p_available_seats is null or p_available_seats < 0 or p_available_seats > p_total_capacity then
    raise exception 'Invalid event capacity or available seats';
  end if;
  if length(coalesce(p_description, '')) > 5000 or length(coalesce(p_event_policies, '')) > 5000 then
    raise exception 'Description and event policies must be 5000 characters or fewer';
  end if;
  if p_location_status not in ('confirmed', 'tba') then
    raise exception 'Invalid location status';
  end if;
  if length(coalesce(p_image_url, '')) > 2048 or length(coalesce(p_banner_image_url, '')) > 2048 then
    raise exception 'Image URL is too long';
  end if;

  select coalesce(event_details, '{}'::jsonb) into v_event_details
    from public.event_submissions
   where id = p_event_id and submitted_by = auth.uid()
   for update;
  if not found then
    raise exception 'Event not found or you do not have permission to edit it';
  end if;

  update public.event_submissions
     set title = trim(p_title),
         starts_at = p_starts_at,
         ends_at = p_ends_at,
         description = nullif(trim(coalesce(p_description, '')), ''),
         ticket_price = p_ticket_price,
         image_url = coalesce(nullif(trim(p_image_url), ''), image_url),
         event_details = case
           when nullif(trim(coalesce(p_banner_image_url, '')), '') is null then v_event_details
           else v_event_details || jsonb_build_object('banner_image_url', trim(p_banner_image_url))
         end,
         total_capacity = p_total_capacity,
         available_seats = p_available_seats,
         event_policies = nullif(trim(coalesce(p_event_policies, '')), ''),
         venue = case when event_mode = 'online' then 'Online Event' when p_location_status = 'tba' then 'To Be Announced' else trim(coalesce(p_venue, venue)) end,
         locality = case when event_mode = 'online' then 'Online' else nullif(trim(coalesce(p_locality, '')), '') end,
         venue_address = case when p_location_status = 'confirmed' then nullif(trim(coalesce(p_venue_address, '')), '') else null end,
         map_link = case when p_location_status = 'confirmed' then nullif(trim(coalesce(p_map_link, '')), '') else null end,
         online_event_link = nullif(trim(coalesce(p_online_event_link, '')), ''),
         location_status = case when event_mode = 'online' then 'not_required' else p_location_status end,
         updated_at = now()
   where id = p_event_id and submitted_by = auth.uid();
end;
$$;

revoke all on function public.update_own_event_content(uuid,text,timestamptz,timestamptz,text,numeric,text,text,integer,integer,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.update_own_event_content(uuid,text,timestamptz,timestamptz,text,numeric,text,text,integer,integer,text,text,text,text,text,text,text) to authenticated;