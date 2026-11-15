This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin-created properties

Sign in as an Admin, select **Add Property**, enter the public details and add
1–5 photos, then save. In **Property Management**, select **Publish / Approve**
to make the listing visible; **Edit** updates an Admin-created listing and
**Unpublish** changes its status to rejected. Uploads use the authenticated
Admin session and require the existing `properties` and `property-photos`
permissions. A public bucket exposes uploaded photos independently of listing
status, including after unpublishing. Do not upload private photos or enter
private contact information. A failed or uncertain save may leave public photos;
check the property list and Storage before retrying.

## Contact and visit requests

Set `NEXT_PUBLIC_BUSINESS_PHONE` to the verified Naren Realty business number in
international format (digits with an optional leading `+`), then restart or
redeploy the application. This number is public; do not use an owner's personal
number. Until configured, Contact is disabled.

Visit requests require customer sign-in and the separately reviewed
`supabase/migrations/0015_visit_requests_proposal.sql`; it has not been applied.
Schedule Visit stays disabled unless the server-side `VISIT_REQUESTS_ENABLED`
is set to `true`. Enable it only after the migration and authorization checks
have been applied and verified; it is not a database health check.
Before applying, verify the live `profiles` and `properties` schema, protected
Admin role provisioning, RLS visibility, effective grants, and the UUID type of
`properties.id`. Test customer isolation, Admin access, approved-property checks
and concurrent duplicates with real accounts in an isolated Supabase project.
The offered times are preferences, not live availability, and requests remain
pending until Admin review. The system does not notify customers when their
requests are confirmed or rescheduled; Admin must contact them separately.

## Customer property submissions

The `/list-property` form is disabled by default and does not save submissions until
private database and Storage setup is reviewed and deployed separately. The local
`supabase/migrations/0009_private_property_submissions_proposal.sql` is a proposal,
not an applied migration. Before enabling the feature, verify the live profiles
authorization, effective grants, `is_admin()` function, and **all** Storage policies:
existing permissive policies can allow access to the new bucket. Review and test the
proposal against the live schema in an approved environment.

The existing server-side environment switch is not sufficient to enable new
submissions: the separate upload readiness gate is intentionally hard-disabled.
Do not enable it until the private photo lifecycle is implemented and reviewed.
The same gate also blocks rejected-submission resubmission. Applying database
proposals or setting `PROPERTY_SUBMISSIONS_ENABLED` alone will not enable writes;
the hard-coded guard requires a separately reviewed application change after
the security and integration prerequisites below are satisfied.
The Admin review queue also requires
the separately proposed `supabase/migrations/0010_customer_submission_review_proposal.sql`.
Review its SECURITY DEFINER owner, EXECUTE grants, profile-role protection and
concurrent decision behavior before applying it. The proposed `0016` replaces
review-only approval with transactional publication. The Admin must review
free-text fields and photos for private contact information before approval;
approval exposes the address, description, details and photos on the website.
The photo route serves the original private objects only while the matching
property is approved and the approved submission links to that property.
Existing public table grants must still be reviewed: the application projection
cannot prevent direct API access to fields allowed by database grants.
Rejected-submission photo replacement remains unimplemented.

The local `0013_submission_details_proposal.sql` adds structured details for the
Customer form and a resubmission function. It has not been applied. Its validator
is generated from the same field and amenity definitions as the application; run
`node scripts/generate-submission-validator.mjs --check` after changing those
definitions. The proposed migration removes the proposed Customer insert,
upload and delete policies and grants: it does not implement new uploads. This
fail-closed state blocks the existing unsafe upload/delete flow. The migration retires the
old resubmission RPC, so older clients must be upgraded before it is applied.
Category details and amenities are
retained when switching categories. Existing private photos are retained on
resubmission; replacement is not implemented.

The new `0014_private_submission_lifecycle_proposal.sql` adds a service-only
attempt journal and transactional commit. The server verifies the user before
passing their identity to service-only functions; these functions do not
authenticate that identity themselves. The unchanged hard readiness gate keeps
new submissions disabled. A stable in-memory form attempt ID enables retries
while the page remains open; after reload, check existing submissions before
starting again. The private bucket retains committed objects without promotion.
An Admin can run bounded reconciliation for expired attempts when the review
feature is configured. Tombstones are revisited because an in-flight upload can
finish after cleanup. Schedule repeated cleanup and monitor errors before use.
It only covers objects recorded in new attempt manifests, not older orphaned
uploads. Photo replacement on resubmission remains unavailable.

The Phase 1 proposals depend on `0009`, then `0010`, then `0011`, then `0013`,
then `0014`; publication additionally requires `0016`.
`0012` is publication-state preparation and is not required for Phase 1.
These proposals are one-time migrations, not idempotent bootstrap scripts; first
verify that their table, bucket, policies, functions and columns do not already
exist and that target schema and ownership are compatible. Test them together
with real authenticated users in an isolated Supabase environment. Audit all
effective policies and grants: other permissive Storage policies or inherited
privileges could still allow direct writes. Verify object metadata, lost responses,
concurrent upload/cleanup, scheduled cleanup and service-role access before enabling.
Review pre-existing orphaned objects separately; never delete Storage metadata
directly. The Admin review page displays saved details and private photo links.

In an isolated test project, review and apply the complete proposal files in
order: `0009`, `0010`, `0011`, `0013`, `0014`, `0016`. Do not run only part of the
sequence on a public project: `0009` initially grants customer uploads and inserts
which `0013` removes. Restrict access during the sequence and verify the resulting
effective policies before exposing it. `0013` requires the original `0011` function;
`0014` requires `0013`. `0012` is unrelated publication preparation.

The private server uses `SUPABASE_SERVICE_ROLE_KEY` only on the server for Storage
upload/download/removal and execution of the four `0014` lifecycle RPCs. The
`SECURITY DEFINER` functions must have a trusted owner and pinned search path;
`p_actor` is supplied by server code and is not authenticated by the database.
Review service-role grants without revoking existing unrelated privileges, plus
the authenticated role's owner/Admin SELECT access and Admin photo-read policy.
The bucket must remain private and the 5 MB JPEG/PNG/WebP restrictions and all
effective Storage policies must be checked, including pre-existing permissive
policies. Verify the service-role secret is not present in client bundles.

After isolated security review and a separately approved readiness change, test
two distinct customers and an Admin: submit details and amenities with photos,
confirm only the owner's row and private objects are readable, verify anonymous
and other-customer access is denied, review and reject as Admin, and verify
resubmission retains details and photo references. Test interrupted upload,
lost commit response, duplicate attempts and repeated reconciliation, ensuring
referenced files are never removed. Confirm approval publishes complete details,
and that unpublishing immediately prevents the photo route from serving images.
Do not claim production readiness without testing the live target.

## Home service enquiries

The Home Services catalogue and enquiry forms are available locally, but submission
and Admin management are hard-disabled until the proposed
`supabase/migrations/0017_home_service_enquiries_proposal.sql` is reviewed and
verified against the connected project. The proposal requires an existing
`profiles` table, protected roles and a safe `public.is_admin()` function.
Authenticated users may insert only their own enquiries; status updates are for
Admins. Review all effective grants and RLS policies and test with separate
Customer and Admin accounts before changing the readiness guard. No service
provider or loan approval is implied.

## Service provider marketplace proposal

The local directory, application, vendor enquiry and Admin management screens
are hard-disabled by `vendorMarketplaceReady()`. The separate
`supabase/migrations/0018_vendor_marketplace_proposal.sql` is review-only and
has not been applied. It requires protected profile roles, a verified
`public.is_admin()` callable by authenticated users, and appropriately owned
functions and schemas. Review its grants, RLS, function ownership and audit
behavior against the actual database before any application. Public vendor
rows contain no private contact, address or commission details.

The Services screen reads active categories and active approved-provider records;
the separately supplied public provider name is shown, but private contact
details and commission terms are not public. The proposed enquiry trigger
captures the provider category, and Admin follow-up remarks are separate from
customer-visible enquiries. The proposal is not an upgrade script for an
already-applied 0018 and must be reconciled with any existing database.

Portfolio uploads and managed locations are not implemented. Before enabling
the marketplace, complete those requirements and verify database authorization,
concurrency, user sessions and privacy with real Customer and Admin accounts.
Do not treat the local mocked tests as live security verification.
Admins can remove unused categories; categories referenced by applications or
enquiries must instead be deactivated to preserve existing records. The delete
grant and Admin-only policy are part of the review-only `0018` proposal, not
changes applied to a live database.

## Matches and loan requirements

The Matches and Loans forms and Admin queue are local, gated implementation
only. `supabase/migrations/0019_requirements_proposal.sql` is review-only and
has not been applied. Do not enable `requirementsReady()` until schema,
profile role protection, RLS, function ownership and authenticated Customer
and Admin isolation have been verified against the target database. Loan
requests are leads, not approval or disbursement.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
