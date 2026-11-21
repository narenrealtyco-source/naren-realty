-- REVIEW ONLY. Depends on 0009 and 0011; do not apply without reviewing
-- live RLS, Storage policies, grants, profile role protection and function owner.
-- Private uploads and direct submission inserts remain disabled until a safe
-- photo lifecycle is implemented and all effective Storage policies are reviewed.
begin;

-- BEGIN GENERATED VALIDATOR. Run scripts/generate-submission-validator.mjs after changing form definitions.
create function public.property_submission_details_valid(p_details jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_schema constant jsonb := $schema${"fields":{"common_property_type":{"type":"text","options":["Apartment / Flat","Independent House","Villa","Studio Apartment","PG Building","Hostel Building","House / Villa","PG / Hostel","Short stay","Other"]},"common_purpose":{"type":"text","options":["Rent","Resale","New Property","PG","Short Stay"]},"common_built_up_area":{"type":"number"},"common_landmark":{"type":"text"},"common_city":{"type":"text"},"common_pincode":{"type":"text"},"common_society":{"type":"text"},"common_available_from":{"type":"date"},"Rental_bhk":{"type":"text","options":["1 RK","1 BHK","2 BHK","3 BHK","4 BHK","5 BHK"]},"Rental_bedrooms":{"type":"number"},"Rental_bathrooms":{"type":"number"},"Rental_balconies":{"type":"number"},"Rental_floor":{"type":"number"},"Rental_total_floors":{"type":"number"},"Rental_age":{"type":"text","options":["New / Ready to Move","1–5 Years","5–10 Years","10+ Years"]},"Rental_entry":{"type":"text","options":["North","South","East","West","North-East","North-West","South-East","South-West"]},"Rental_exit":{"type":"text","options":["North","South","East","West","North-East","North-West","South-East","South-West"]},"Rental_furnishing":{"type":"text","options":["Unfurnished","Semi-Furnished","Fully Furnished"]},"Rental_wifi_available":{"type":"text","options":["Yes","No"]},"Rental_wifi_billing":{"type":"text","options":["Included","Extra Charges"]},"Rental_wifi_monthly_charges":{"type":"number"},"Rental_wifi_coverage":{"type":"text","options":["Each Room","Common Area","Entire Property"]},"Rental_wifi_speed":{"type":"number"},"Rental_deposit":{"type":"number"},"Rental_negotiable":{"type":"text","options":["Yes","No"]},"Rental_maintenance_included":{"type":"text","options":["Yes","No"]},"Rental_maintenance":{"type":"number"},"Rental_parking_charges":{"type":"number"},"Rental_parking_slots":{"type":"number"},"Rental_tenant_preference":{"type":"text","options":["Family","Bachelor","Working Professionals","Any"]},"Resale_bhk":{"type":"text","options":["1 RK","1 BHK","2 BHK","3 BHK","4 BHK","5 BHK"]},"Resale_bedrooms":{"type":"number"},"Resale_bathrooms":{"type":"number"},"Resale_balconies":{"type":"number"},"Resale_floor":{"type":"number"},"Resale_total_floors":{"type":"number"},"Resale_age":{"type":"text","options":["New / Ready to Move","1–5 Years","5–10 Years","10+ Years"]},"Resale_entry":{"type":"text","options":["North","South","East","West","North-East","North-West","South-East","South-West"]},"Resale_exit":{"type":"text","options":["North","South","East","West","North-East","North-West","South-East","South-West"]},"Resale_furnishing":{"type":"text","options":["Unfurnished","Semi-Furnished","Fully Furnished"]},"Resale_wifi_available":{"type":"text","options":["Yes","No"]},"Resale_wifi_billing":{"type":"text","options":["Included","Extra Charges"]},"Resale_wifi_monthly_charges":{"type":"number"},"Resale_wifi_coverage":{"type":"text","options":["Each Room","Common Area","Entire Property"]},"Resale_wifi_speed":{"type":"number"},"Resale_negotiable":{"type":"text","options":["Yes","No"]},"Resale_parking_details":{"type":"text"},"Resale_parking_slots":{"type":"number"},"Resale_parking_charges":{"type":"number"},"Resale_ownership":{"type":"text"},"Resale_possession":{"type":"text","options":["Ready to Move","Under Construction"]},"Resale_loan_status":{"type":"text","options":["No Loan","Loan Active","Loan Eligible","Not Known"]},"Resale_maintenance_charges":{"type":"number"},"PG_rooms":{"type":"number"},"PG_total_beds":{"type":"number"},"PG_available_beds":{"type":"number"},"PG_gender":{"type":"text","options":["Boys","Girls","Co-Living"]},"PG_suitable":{"type":"text","options":["Students","Working Professionals","Both"]},"PG_curfew":{"type":"text"},"PG_visitors":{"type":"text","options":["Yes","No"]},"PG_smoking":{"type":"text","options":["Yes","No"]},"PG_alcohol":{"type":"text","options":["Yes","No"]},"PG_food_availability":{"type":"text","options":["Not Provided","Included","Extra Charges"]},"PG_food_charges":{"type":"number"},"PG_electricity_charges":{"type":"number"},"PG_parking_slots":{"type":"number"},"PG_parking_charges":{"type":"number"},"PG_wifi_available":{"type":"text","options":["Yes","No"]},"PG_wifi_billing":{"type":"text","options":["Included","Extra Charges"]},"PG_wifi_monthly_charges":{"type":"number"},"PG_wifi_coverage":{"type":"text","options":["Each Room","Common Area","Entire Property"]},"PG_wifi_speed":{"type":"number"},"Airbnb_stay_type":{"type":"text","options":["Entire Property","Private Room","Shared Room","Entire Apartment","Studio Apartment","Villa","Other"]},"Airbnb_guests":{"type":"number"},"Airbnb_bedrooms":{"type":"number"},"Airbnb_bathrooms":{"type":"number"},"Airbnb_deposit":{"type":"number"},"Airbnb_minimum_stay":{"type":"number"},"Airbnb_maximum_stay":{"type":"number"},"Airbnb_weekend_price":{"type":"number"},"Airbnb_weekly_price":{"type":"number"},"Airbnb_monthly_price":{"type":"number"},"Airbnb_check_in":{"type":"time"},"Airbnb_check_out":{"type":"time"},"Airbnb_cleaning":{"type":"number"},"Airbnb_rules":{"type":"text"},"Airbnb_furnishing":{"type":"text","options":["Unfurnished","Semi-Furnished","Fully Furnished"]},"Airbnb_wifi_available":{"type":"text","options":["Yes","No"]},"Airbnb_wifi_billing":{"type":"text","options":["Included","Extra Charges"]},"Airbnb_wifi_monthly_charges":{"type":"number"},"Airbnb_wifi_coverage":{"type":"text","options":["Each Room","Common Area","Entire Property"]},"Airbnb_wifi_speed":{"type":"number"},"Airbnb_parking_slots":{"type":"number"},"Airbnb_parking_charges":{"type":"number"},"PG_sharing_0_rent":{"type":"number"},"PG_sharing_0_deposit":{"type":"number"},"PG_sharing_0_units":{"type":"number"},"PG_sharing_1_rent":{"type":"number"},"PG_sharing_1_deposit":{"type":"number"},"PG_sharing_1_units":{"type":"number"},"PG_sharing_2_rent":{"type":"number"},"PG_sharing_2_deposit":{"type":"number"},"PG_sharing_2_units":{"type":"number"},"PG_sharing_3_rent":{"type":"number"},"PG_sharing_3_deposit":{"type":"number"},"PG_sharing_3_units":{"type":"number"},"PG_sharing_4_rent":{"type":"number"},"PG_sharing_4_deposit":{"type":"number"},"PG_sharing_4_units":{"type":"number"},"PG_sharing_5_rent":{"type":"number"},"PG_sharing_5_deposit":{"type":"number"},"PG_sharing_5_units":{"type":"number"},"PG_sharing_6_rent":{"type":"number"},"PG_sharing_6_deposit":{"type":"number"},"PG_sharing_6_units":{"type":"number"}},"amenities":{"Rental":["Lift","Covered Parking","Open Parking","Power Backup","24x7 Water Supply","Security","CCTV Surveillance","Clubhouse","Swimming Pool","Gymnasium","Garden","Children's Play Area","Walking Track","Indoor Games","Visitor Parking","Gas Pipeline","Gated Community","Intercom","Fire Safety","Rainwater Harvesting","Solar Water Heating","Sports Facilities","Society Office","EV Charging","Modular Kitchen","TV","Refrigerator","Geyser","Sofa","Dining Table","Bed","Mattress","Wardrobe / Almirah","AC","Washing Machine","Microwave","RO Purifier","Curtains","Fans","Lights","Wi-Fi"],"Resale":["Lift","Covered Parking","Open Parking","Power Backup","24x7 Water Supply","Security","CCTV Surveillance","Clubhouse","Swimming Pool","Gymnasium","Garden","Children's Play Area","Walking Track","Indoor Games","Visitor Parking","Gas Pipeline","Gated Community","Intercom","Fire Safety","Rainwater Harvesting","Solar Water Heating","Sports Facilities","Society Office","EV Charging","Modular Kitchen","TV","Refrigerator","Geyser","Sofa","Dining Table","Bed","Mattress","Wardrobe / Almirah","AC","Washing Machine","Microwave","RO Purifier","Curtains","Fans","Lights","Wi-Fi"],"PG":["Wi-Fi","Food / Mess","Refrigerator","Washing Machine","Air Conditioning","Geyser / Hot Water","Housekeeping","Laundry Service","CCTV Surveillance","24x7 Security","Biometric Access","Power Backup","Drinking Water","Common Kitchen","Dining Area","Study Table","Wardrobe","Bed with Mattress","Attached Bathroom","Common Bathroom","Lift","Parking","Gym","Common TV / Recreation Room","RO Water Purifier","Indoor Games","Outdoor Sitting Area","Pillow","Study Lamp","Locker","Breakfast","Lunch","Dinner","Tea / Snacks","Kitchen Access","Cleaning Service","Water Supply","Microwave"],"Airbnb":["Wi-Fi","AC","TV","Kitchen","Refrigerator","Washing Machine","Geyser","Lift","Parking","Power Backup","Swimming Pool","Gym","Balcony","Garden","Security","CCTV","Housekeeping","Workspace","Dining Area","RO Water","Bed & Mattress","Wardrobe","Sofa","Dining Table","Curtains","Extra Bedding","Modular Kitchen","Microwave","Induction / Gas","RO Purifier","Electric Kettle","Cookware & Utensils","Toaster","Towels","Toiletries","Hair Dryer","Iron & Ironing Board","Breakfast Included","Airport Pickup","Private Entrance"]},"facilities":["Food Included","Wi-Fi Included","Breakfast Included","Lunch Included","Dinner Included","Electricity Included","Maintenance Included","Attached Bathroom","AC Available","Laundry Included","Housekeeping Included","Water Included","Tea / Snacks Included"]}$schema$::jsonb;
  v_key text;
  v_value jsonb;
  v_item jsonb;
  v_field jsonb;
  v_text text;
  v_bytes bigint := 0;
  v_date date;
begin
  if p_details is null or pg_catalog.jsonb_typeof(p_details) <> 'object'
     or (p_details - array['version', 'values', 'amenities', 'facilities']) <> '{}'::jsonb
     or p_details->'version' is distinct from '1'::jsonb
     or pg_catalog.jsonb_typeof(p_details->'values') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_details->'amenities') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_details->'facilities') is distinct from 'array' then
    return false;
  end if;
  for v_key, v_value in select * from pg_catalog.jsonb_each(p_details->'values') loop
    v_field := v_schema->'fields'->v_key;
    if v_field is null or pg_catalog.jsonb_typeof(v_value) <> 'string' then return false; end if;
    v_text := v_value #>> '{}';
    v_bytes := v_bytes + pg_catalog.octet_length(v_key) + pg_catalog.octet_length(v_text);
    if pg_catalog.char_length(v_text) > 2000 then return false; end if;
    if v_text = '' then continue; end if;
    if v_field ? 'options' and not (v_field->'options' ? v_text) then return false; end if;
    if v_field->>'type' = 'number' then
      if v_text !~ '^(?:[0-9]+(?:[.][0-9]+)?|[.][0-9]+)$' then return false; end if;
      if v_text::numeric > 1000000000000 then return false; end if;
    elsif v_field->>'type' = 'date' then
      if v_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or v_text like '0000-%' then return false; end if;
      begin
        v_date := v_text::date;
      exception when datetime_field_overflow or invalid_datetime_format then
        return false;
      end;
      if pg_catalog.to_char(v_date, 'YYYY-MM-DD') <> v_text then return false; end if;
    elsif v_field->>'type' = 'time' and v_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      return false;
    end if;
  end loop;
  for v_key, v_value in select * from pg_catalog.jsonb_each(p_details->'amenities') loop
    if not (v_schema->'amenities' ? v_key) or pg_catalog.jsonb_typeof(v_value) <> 'array' then return false; end if;
    v_bytes := v_bytes + pg_catalog.octet_length(v_key);
    if (select pg_catalog.count(*) from pg_catalog.jsonb_array_elements(v_value)) <>
       (select pg_catalog.count(distinct item) from pg_catalog.jsonb_array_elements(v_value) as items(item)) then return false; end if;
    for v_item in select * from pg_catalog.jsonb_array_elements(v_value) loop
      if pg_catalog.jsonb_typeof(v_item) <> 'string' then return false; end if;
      v_text := v_item #>> '{}';
      if not (v_schema->'amenities'->v_key ? v_text) then return false; end if;
      v_bytes := v_bytes + pg_catalog.octet_length(v_text);
    end loop;
  end loop;
  v_value := p_details->'facilities';
  if (select pg_catalog.count(*) from pg_catalog.jsonb_array_elements(v_value)) <>
     (select pg_catalog.count(distinct item) from pg_catalog.jsonb_array_elements(v_value) as items(item)) then return false; end if;
  for v_item in select * from pg_catalog.jsonb_array_elements(v_value) loop
    if pg_catalog.jsonb_typeof(v_item) <> 'string' then return false; end if;
    v_text := v_item #>> '{}';
    if not (v_schema->'facilities' ? v_text) then return false; end if;
    v_bytes := v_bytes + pg_catalog.octet_length(v_text);
  end loop;
  return v_bytes <= 24000;
end;
$$;
-- END GENERATED VALIDATOR
-- Explicitly grant the invoker check even if default function privileges differ.
grant execute on function public.property_submission_details_valid(jsonb) to authenticated;

alter table public.property_submissions
  add column details jsonb not null
    default '{"version":1,"values":{},"amenities":{},"facilities":[]}'::jsonb
    check (public.property_submission_details_valid(details));

-- Fail closed: the current upload/delete flow cannot atomically coordinate
-- Storage with the submission row or validate direct uploads' image content.
revoke insert on public.property_submissions from public, anon, authenticated;
revoke insert (id, title, category, locality, address, price, area, description, photo_paths, details)
  on public.property_submissions from public, anon, authenticated;
drop policy "Customers insert own pending submissions" on public.property_submissions;
drop policy "Customers upload private submission photos" on storage.objects;
drop policy "Customers remove unsubmitted private photos" on storage.objects;

-- Retire the older endpoint so old clients cannot resubmit without details.
revoke execute on function public.resubmit_property_submission(uuid, text, text, text, text, numeric, numeric, text)
  from public, anon, authenticated;

create function public.resubmit_property_submission_v2(
  p_id uuid, p_title text, p_category text, p_locality text, p_address text,
  p_price numeric, p_area numeric, p_description text, p_details jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'customer'
  ) then
    raise exception 'Customer authorization is required' using errcode = '42501';
  end if;
  if not public.property_submission_details_valid(p_details) then
    raise exception 'Invalid submission details' using errcode = '22023';
  end if;
  update public.property_submissions
  set title = pg_catalog.btrim(p_title), category = p_category,
      locality = pg_catalog.btrim(p_locality), address = pg_catalog.btrim(p_address),
      price = p_price, area = p_area, description = pg_catalog.btrim(p_description),
      details = p_details, status = 'pending', rejection_feedback = null,
      reviewed_by = null, reviewed_at = null
  where id = p_id and user_id = v_actor and status = 'rejected'
    and published_property_id is null;
  if not found then
    raise exception 'Submission not found or not eligible for resubmission' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.resubmit_property_submission_v2(uuid, text, text, text, text, numeric, numeric, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.resubmit_property_submission_v2(uuid, text, text, text, text, numeric, numeric, text, jsonb)
  to authenticated;
commit;
