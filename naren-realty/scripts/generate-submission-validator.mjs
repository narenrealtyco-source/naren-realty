import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import * as properties from "../app/lib/properties.ts";

const source = await readFile(new URL("../app/list-property/additional-fields.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const definitions = {};
vm.runInNewContext(compiled, { exports: definitions, require(name) {
  if (name !== "../lib/properties") throw new Error(`Unexpected dependency: ${name}`);
  return properties;
} });
const fields = {};
function add(scope, list) {
  for (const field of list) fields[`${scope}_${field.key}`] = { type: field.type ?? "text", ...(field.options ? { options: field.options } : {}) };
}
add("common", definitions.commonFields);
for (const category of properties.PROPERTY_CATEGORIES) add(category, definitions.additionalFields(category));
add("PG", definitions.sharingFields);
const schema = {
  fields,
  amenities: Object.fromEntries(properties.PROPERTY_CATEGORIES.map((category) => [category, definitions.amenitiesForCategory(category)])),
  facilities: definitions.pgFacilities,
};
const sql = `-- BEGIN GENERATED VALIDATOR. Run scripts/generate-submission-validator.mjs after changing form definitions.
create function public.property_submission_details_valid(p_details jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_schema constant jsonb := $schema$${JSON.stringify(schema)}$schema$::jsonb;
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
`;
const file = new URL("../supabase/migrations/0013_submission_details_proposal.sql", import.meta.url);
const migration = await readFile(file, "utf8");
const start = migration.indexOf("-- BEGIN GENERATED VALIDATOR");
const legacyStart = migration.indexOf("create function public.property_submission_details_valid");
const endMarker = "-- END GENERATED VALIDATOR";
const markerEnd = migration.indexOf(endMarker, start);
const end = start >= 0 ? markerEnd + endMarker.length + (migration[markerEnd + endMarker.length] === "\n" ? 1 : 0) : migration.indexOf("-- Explicitly grant the invoker check");
if ((start < 0 && legacyStart < 0) || (start >= 0 && markerEnd < 0) || end < 0) throw new Error("Migration validator markers not found.");
const result = migration.slice(0, start >= 0 ? start : legacyStart) + sql + migration.slice(end);
if (process.argv.includes("--check")) {
  if (result !== migration) throw new Error("Generated SQL validator is out of date.");
} else {
  await writeFile(file, result, "utf8");
}
