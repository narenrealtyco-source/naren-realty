# Naren Realty: read-only Supabase assessment

Assessment date: 13 November 2026. **No production data, schema, policies,
storage objects or authentication settings were changed.** The marketplace
readiness gate remains disabled.

## Scope and limitations

Read-only GET requests to the configured project returned the PostgREST OpenAPI
schema using the server-side service role, the Storage bucket list using the
same role, and public Auth settings using the anonymous key. No table rows,
users, storage objects, SQL or RPCs were queried. A separate attempt to
inspect the anonymous OpenAPI schema could not be completed because execution
access was unavailable.

OpenAPI describes the exposed API, not necessarily every database object:
absence below means **not exposed in this response**, not proof that an object
does not exist. Its required-property annotations are listed as reported;
they are not a substitute for checking database nullability, constraints,
grants, or effective permissions. Auth settings are only the public settings
returned by the endpoint, not a complete authentication configuration audit.
RLS enablement and policy expressions, table and column grants, role
inheritance, triggers, function bodies and owners, indexes, and Storage
policies could not be inspected with the available access. No real
customer/Admin isolation or write tests were performed.

## Observed public API schema

The service-role OpenAPI response reported these six tables. Columns are
shown as `name: PostgreSQL type`. Explicit nullable annotations were not
present in the response. Relationships below are only those annotated by
OpenAPI; other constraints and relationships remain unverified.

| Table | Columns | OpenAPI required properties | Annotated relationships |
|---|---|---|---|
| `properties` | `id: uuid`, `owner_id: uuid`, `title: text`, `category: text`, `locality: text`, `price: numeric`, `details: jsonb`, `photos: jsonb`, `status: text`, `created_at: timestamptz`, `updated_at: timestamptz` | `id`, `owner_id`, `title`, `category`, `status` | `owner_id` → `profiles.id` |
| `policy_acceptances` | `id: uuid`, `user_id: uuid`, `policy_type: text`, `policy_version: text`, `accepted_at: timestamptz` | `id`, `user_id`, `policy_type`, `policy_version` | `user_id` → `profiles.id` |
| `profiles` | `id: uuid`, `full_name: text`, `phone: text`, `role: text`, `created_at: timestamptz`, `registration_category: text` | `id`, `role` | None annotated |
| `customer_favorites` | `id: uuid`, `customer_id: uuid`, `property_id: uuid`, `created_at: timestamptz` | `id`, `customer_id`, `property_id` | `customer_id` → `profiles.id`; `property_id` → `properties.id` |
| `brokerage_acknowledgements` | `id: uuid`, `user_id: uuid`, `property_id: uuid`, `policy_version: text`, `accepted_at: timestamptz` | `id`, `user_id`, `policy_version` | `user_id` → `profiles.id`; `property_id` → `properties.id` |
| `enquiries` | `id: uuid`, `customer_id: uuid`, `property_id: uuid`, `customer_name: text`, `customer_phone: text`, `requirement: text`, `message: text`, `status: text`, `admin_notes: text`, `follow_up_date: timestamptz`, `created_at: timestamptz` | `id`, `customer_id`, `status` | `customer_id` → `profiles.id`; `property_id` → `properties.id` |

The API also advertised `is_admin` and `rls_auto_enable` RPC endpoints; neither
was invoked. Their existence does not establish their behavior or safety.

## Storage and authentication

- Storage listed `property-photos` as public, with no bucket-specific file
  size limit or MIME restriction reported. Public objects may be accessible
  independently of a property's approval status. Existing objects, global
  restrictions and all Storage policies remain uninspected. Do not upload
  private provider or customer information there.
- Public Auth settings reported email enabled, signup enabled and email
  autoconfirm disabled; phone autoconfirm was also reported disabled. This
  does not verify redirect URLs, rate limits, email delivery, other provider
  settings, user roles, profile provisioning, or session behavior.
- The application checks `profiles.role` for Admin authorization. It is
  essential to verify that ordinary users cannot elevate this role, including
  through inherited grants, direct API access or signup triggers. The
  existence of `is_admin` does not prove that it enforces this safely.

## Feature gaps and proposed migrations

All referenced SQL files are **review-only proposals**, not verified deployment
scripts. They may conflict with existing objects that were not visible through
the API. Do not apply them until catalog inspection, ownership/grant review,
backup and an explicit deployment plan are complete. Existing working
features and data must not be reset or removed.

### Properties and visits

- Public property code queries approved `properties` and uses the public
  photo bucket. Check the actual RLS and column grants: the application's
  projection does not prevent direct API access to other granted columns,
  including `details`, `photos`, or owner identifiers.
- Owner submission uploads are hard-disabled. The API did not expose
  `property_submissions` or `profile_capabilities`; their underlying existence
  is unverified. Review the existing submission proposals in dependency
  order: `0009`, `0010`, `0011`, `0013`, `0014`, then `0016`. They include
  private storage, review and publication. As documented in the project
  README, do not deploy only the initial proposal: later proposals remove
  unsafe intermediate permissions.
- Visit requests use a separate environment gate and proposed `0015`.
  `visit_requests` was not exposed in the service-role OpenAPI response.
  Verify `profiles`, approved-property checks and all effective privileges
  before adapting this proposal. No visit functionality was enabled here.

### Matches and Loans

- `requirementsReady()` is hard-disabled. The API did not expose
  `property_requirements`, `loan_types`, `loan_requirements` or
  `requirement_followups`. Matching code and customer/Admin forms already
  exist locally, but are not evidence of live persistence.
- Proposed migration `0019_requirements_proposal.sql` defines these tables,
  RLS and an Admin follow-up RPC. Review customer-owned reads and inserts,
  customer-only closing, Admin-only edits and private remarks, function
  ownership and cross-user isolation before adapting it. Loan leads are not
  loan approvals.

### Services and provider enquiries

- The API did not expose `service_categories`, `service_vendor_applications`,
  `service_vendors`, `vendor_enquiries`, `vendor_enquiry_followups` or
  `service_vendor_reviews`. The local directory and Admin forms exist, but
  `vendorMarketplaceReady()` remains hard-disabled.
- Proposed migration `0018_vendor_marketplace_proposal.sql` contains the 18
  requested categories, private applications, a separate public vendor
  projection, enquiry category snapshot, Admin reviews and follow-ups, and
  Admin-only category management including deletion of unreferenced
  categories. Foreign keys should prevent removing categories referenced by
  applications or enquiries; use deactivation to retain history. Check all
  grants and policies on the actual schema, including other permissive
  policies, and confirm only approved and active providers can be served.
- The current form requires sign-in for provider applications and customer
  enquiries. A guest-enquiry design is not implemented; allowing anonymous
  writes safely would need abuse controls, privacy/retention decisions and a
  separate reviewed authorization design.
- Portfolio uploads and lifecycle are **not implemented**. Design private
  uploads, review and publication, file validation, authorized read paths,
  unpublishing, cleanup and concurrent retries before enabling the
  marketplace. Do not place pending portfolio files in the public property
  bucket.
- The older `0017_home_service_enquiries_proposal.sql` concerns a separate
  legacy enquiry flow and still contains the historical builder-project slug.
  Do not apply it unchanged as the new marketplace or discard historical
  records without an approved migration plan.

### Referrals and existing enquiries

- Refer & Earn is labeled coming soon in the application; there is no
  referral table exposed in the inspected API and no referral tracking flow
  found in the app. A new review-only referral migration still needs a
  product-approved model for referral consent, eligibility, duplicate and
  self-referral rules, reward verification, payout status, access, retention
  and audit. Do not infer payout or approval from a form submission.
- The existing `enquiries` table exposes status, admin notes and follow-up
  columns in schema metadata. Admin code uses them, but the live grants/RLS,
  customer submission path and whether customers can directly read private
  Admin notes are unverified. Review and, if necessary, propose a separate
  Admin-only follow-up table or column-level restrictions without losing
  existing notes or breaking current clients.
- Policy and brokerage tables exist in the exposed API, while parts of the
  local policy implementation still use browser storage. Verify the actual
  write paths and avoid treating browser records as authoritative legal
  evidence. The checked-in Supabase README and privacy-policy text contain
  older prototype descriptions and need a separate accuracy review.

## Read-only catalog inspection still needed

An authorized database administrator can run the following **SELECT-only**
queries in the Supabase SQL editor or a read-only database session. They are
not executed by this assessment. Handle results as confidential operational
metadata. These queries do not read customer rows or Storage objects.

```sql
-- Tables, RLS state and ownership, including tables not exposed by PostgREST.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage') and c.relkind in ('r', 'p')
order by 1, 2;

-- Columns, nullability and defaults in the public schema.
select table_schema, table_name, ordinal_position, column_name, data_type,
       udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- Database constraints, including foreign keys and checks.
select n.nspname as schema_name, c.relname as table_name, con.conname,
       con.contype, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by 1, 2, 3;

-- All policies, including Storage policies that may combine permissively.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- Explicit table and column grants; also review inherited roles and default
-- privileges separately, as these views alone are not effective-permission proof.
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
order by 1, 2, 3, 4;
select table_schema, table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema in ('public', 'storage')
order by 1, 2, 3, 4, 5;

-- Auth/profile triggers and public authorization function ownership/config.
select n.nspname, c.relname, t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal
  and ((n.nspname = 'auth' and c.relname = 'users')
       or (n.nspname = 'public' and c.relname = 'profiles'))
order by 1, 2, 3;
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
       pg_get_userbyid(p.proowner) as owner, p.prosecdef, p.proconfig,
       p.proacl, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin';
```

Separately inspect role memberships, effective table/column/function
privileges for `anon`, `authenticated` and the trusted function owner,
default privileges, relevant indexes, Storage policies and Auth dashboard
settings. Do not expose service-role keys or user records in the report.

## Safe release sequence

1. Complete the catalog and Auth/Storage review above; capture existing
   policies and dependency impact before designing changes.
2. Obtain a restorable backup and an isolated project or approved equivalent
   for integration testing. No isolated project is currently available.
3. Reconcile each proposal with the actual schema, preserving existing
   records and functionality; review trusted owners, pinned search paths,
   effective privileges, foreign keys, rollback and concurrency.
4. Implement missing portfolio and referral functionality and resolve guest
   enquiry requirements before proposing activation.
5. Test with separate customers, provider and Admin, including anonymous and
   cross-account denial, approval/deactivation visibility, successful and
   failed enquiries, uploads, private remarks and recovery. Do not perform
   destructive or test-data writes against production without separate
   approval. Enable gates only after verified deployment and explicit review.

## Local changes made before the read-only request

- `app/home-services/page.tsx`, `register/page.tsx` and
  `vendors/[id]/page.tsx`: also exclude a legacy builder category by name.
- `app/lib/home-services.ts`: reject new legacy builder enquiries while
  retaining the historical label for existing records.
- `app/home-services/ServicesDirectory.tsx`: add the Other Home Services icon
  and keyboard focus for the scrollable category navigation.
- `app/admin/services/vendors/actions.ts` and `Forms.tsx`: add Admin category
  removal with a clear error for referenced categories.
- `supabase/migrations/0018_vendor_marketplace_proposal.sql`: add the
  corresponding proposed Admin-only delete permission and policy. This is
  local SQL only; it has not been applied.
- `README.md`, `tests/home-services.test.mjs`,
  `tests/services-directory.test.mjs` and `tests/vendor-marketplace.test.mjs`:
  document and test the local changes.

The focused local test command passed 20 tests; TypeScript and targeted ESLint
checks passed. The category-selection and enquiry checks use local mocks, not
the production database. Homepage content, existing five-button navigation,
and the marketplace readiness gate were already present and were not enabled
or replaced.
