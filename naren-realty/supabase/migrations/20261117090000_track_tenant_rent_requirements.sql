-- Record genuine tenant activity when a customer submits a rental requirement.
-- This unlocks the existing Tenant referral code only; reward eligibility and
-- the separate Owner capability / approved-listing checks remain unchanged.

begin;

create or replace function public.record_tenant_rent_requirement_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if lower(coalesce(new.requirement_type, '')) = 'rent' then
    insert into public.profile_activity_roles (user_id, activity_role)
    select new.customer_id, 'tenant'
    where new.customer_id is not null
    on conflict (user_id, activity_role)
    do update set updated_at = now();
  end if;

  return new;
end;
$function$;

alter function public.record_tenant_rent_requirement_activity() owner to postgres;
revoke all on function public.record_tenant_rent_requirement_activity() from public, anon, authenticated;

drop trigger if exists track_tenant_rent_requirement_activity on public.property_requirements;
create trigger track_tenant_rent_requirement_activity
after insert on public.property_requirements
for each row
execute function public.record_tenant_rent_requirement_activity();

-- Backfill only customers who have already submitted an explicitly rental
-- requirement. Buying requirements do not create Tenant activity.
insert into public.profile_activity_roles (user_id, activity_role)
select distinct pr.customer_id, 'tenant'
from public.property_requirements pr
where lower(coalesce(pr.requirement_type, '')) = 'rent'
  and pr.customer_id is not null
on conflict (user_id, activity_role)
do update set updated_at = now();

commit;
