-- Event delivery mode and flexible venue details.
alter table public.event_submissions
  add column if not exists event_mode text not null default 'offline',
  add column if not exists location_status text not null default 'confirmed',
  add column if not exists venue_address text,
  add column if not exists map_link text,
  add column if not exists online_event_link text;

alter table public.event_submissions
  drop constraint if exists event_submissions_event_mode_check,
  add constraint event_submissions_event_mode_check
    check (event_mode in ('offline','online','hybrid')),
  drop constraint if exists event_submissions_location_status_check,
  add constraint event_submissions_location_status_check
    check (location_status in ('confirmed','tba','not_required'));

-- Online-only events do not require a physical venue.
update public.event_submissions
   set event_mode = 'online',
       location_status = 'not_required',
       venue = 'Online Event',
       locality = null
 where event_mode = 'online';

create or replace function public.update_own_event_details(
  p_event_id uuid,
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
  v_event_mode text;
  v_location_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_total_capacity is null or p_total_capacity < 1 or p_total_capacity > 100000 then
    raise exception 'Total capacity must be between 1 and 100000';
  end if;
  if p_available_seats is null or p_available_seats < 0 or p_available_seats > p_total_capacity then
    raise exception 'Available seats must be between 0 and total capacity';
  end if;
  if length(coalesce(p_event_policies, '')) > 5000 then
    raise exception 'Event policies must be 5000 characters or fewer';
  end if;

  if p_location_status not in ('confirmed','tba') then raise exception 'Invalid location status'; end if;

  select event_mode, location_status into v_event_mode, v_location_status
    from public.event_submissions
   where id = p_event_id and submitted_by = auth.uid();

  if not found then
    raise exception 'Event not found or you do not have permission to edit it';
  end if;

  if v_event_mode <> 'online' and (nullif(trim(coalesce(p_locality,'')), '') is null
      or (p_location_status = 'confirmed' and nullif(trim(coalesce(p_venue,'')), '') is null)) then
    raise exception 'A city/locality and confirmed venue are required';
  end if;

  update public.event_submissions
     set total_capacity = p_total_capacity,
         available_seats = p_available_seats,
         event_policies = nullif(trim(coalesce(p_event_policies, '')), ''),
         location_status = case when v_event_mode = 'online' then 'not_required' else p_location_status end,
         venue = case when v_event_mode = 'online' then 'Online Event'
                      when p_location_status = 'tba' then 'To Be Announced'
                      else trim(p_venue) end,
         locality = case when v_event_mode = 'online' then null else nullif(trim(p_locality), '') end,
         venue_address = case when p_location_status = 'confirmed' then nullif(trim(coalesce(p_venue_address,'')), '') else null end,
         map_link = case when p_location_status = 'confirmed' then nullif(trim(coalesce(p_map_link,'')), '') else null end,
         online_event_link = case when v_event_mode <> 'offline' then nullif(trim(coalesce(p_online_event_link,'')), '') else null end,
         updated_at = now()
   where id = p_event_id and submitted_by = auth.uid();
end;
$$;

revoke all on function public.update_own_event_details(uuid, integer, integer, text) from public, anon, authenticated;
revoke all on function public.update_own_event_details(uuid, integer, integer, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_own_event_details(uuid, integer, integer, text, text, text, text, text, text, text) to authenticated;
