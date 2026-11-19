-- Store organiser-provided event rules and allow owners to update
-- capacity, available seats, and rules without changing publication status.

alter table public.event_submissions
  add column if not exists event_policies text;

create or replace function public.update_own_event_details(
  p_event_id uuid,
  p_total_capacity integer,
  p_available_seats integer,
  p_event_policies text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  update public.event_submissions
     set total_capacity = p_total_capacity,
         available_seats = p_available_seats,
         event_policies = nullif(trim(coalesce(p_event_policies, '')), ''),
         updated_at = now()
   where id = p_event_id
     and submitted_by = auth.uid();

  if not found then
    raise exception 'Event not found or you do not have permission to edit it';
  end if;
end;
$$;

revoke all on function public.update_own_event_details(uuid, integer, integer, text) from public;
grant execute on function public.update_own_event_details(uuid, integer, integer, text) to authenticated;
