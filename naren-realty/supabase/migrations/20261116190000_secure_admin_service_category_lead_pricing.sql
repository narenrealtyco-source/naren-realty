begin;

-- Lead pricing is admin-controlled. Do not allow ordinary signed-in users
-- to update service category pricing directly.
revoke update on public.service_categories from authenticated;
revoke update (lead_unlock_price) on public.service_categories from authenticated;

create or replace function public.admin_update_service_category_lead_price(
  p_category_id uuid,
  p_lead_unlock_price numeric
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if auth.uid() is null or public.is_admin() is not true then
    raise exception 'Admin authorization is required.';
  end if;

  if p_lead_unlock_price is null
    or p_lead_unlock_price < 0
    or p_lead_unlock_price > 1000000 then
    raise exception 'Lead price must be between 0 and 1000000.';
  end if;

  update public.service_categories
  set lead_unlock_price = p_lead_unlock_price
  where id = p_category_id;

  if not found then
    raise exception 'Service category not found.';
  end if;

  return true;
end;
$function$;

revoke all on function public.admin_update_service_category_lead_price(uuid,numeric) from public, anon;
grant execute on function public.admin_update_service_category_lead_price(uuid,numeric) to authenticated;

commit;
