# Instagram Property Auto-Post — Implementation Specification

## Confirmed product decisions

- **Platform:** Instagram only. Do not publish to Facebook.
- **Trigger:** A property becomes eligible for a social post only after an Admin approves/publishes the property on the website.
- **Publishing mode:** Preview first. Approval must NOT publish automatically.
- **Final action:** An Admin explicitly reviews the generated post and clicks **Publish to Instagram**.
- **Schedule:** No weekly or scheduled posting. Publishing is on-demand after the approval/preview flow.
- **Scope:** Approved property listings intended for sale. Do not post pending, rejected, unpublished, or sold/closed listings.

## Admin workflow

1. Admin reviews and approves a sale listing using the existing Property Management workflow.
2. The system creates a draft Instagram post from the approved listing and its approved/public photos.
3. Admin sees a preview containing the selected image(s), caption, hashtags, price, location, key property facts, NAREN REALTY branding, and the canonical public property URL.
4. Admin can edit the caption, choose/reorder eligible photos, or cancel the draft.
5. Admin clicks **Publish to Instagram** to confirm publication.
6. The server publishes using Meta's supported Instagram Content Publishing API.
7. Admin sees the result and the Instagram permalink when available.

## Admin controls and statuses

- Instagram integration status: Connected / Needs reconnect / Not configured.
- Instagram publishing: Enabled / Disabled.
- Per-property actions: Generate preview, Edit preview, Publish to Instagram, Retry failed post, View Instagram post.
- Per-property status: Not eligible, Preview ready, Awaiting Admin publish, Publishing, Published, Failed, Cancelled.
- Keep a timestamp, Admin actor, property ID, caption snapshot, media references, API result/error summary, and Instagram media/permalink ID for audit.

## Eligibility and safety rules

- Only approved and currently published sale properties are eligible.
- Never publish private owner/tenant phone numbers, email addresses, internal notes, unpublished documents, or private photos.
- Use only photos that are approved for public display and accessible to Meta's media fetch process.
- A sold, closed, rejected, or unpublished property must not be newly posted. If it was already posted, show an Admin option to remove/archive it; do not silently delete Instagram content.
- Enforce idempotency: the same property/draft must not be published twice accidentally. An intentional repost must be a separate explicit Admin action with a confirmation.
- A failed Instagram publish must not undo or change the website property's approval status.
- API failures must be visible to Admin with a safe retry path; never claim Published until Meta confirms success.
- Keep Meta access tokens and app secrets server-side only. Never expose them in browser code, public API responses, logs, or Git.

## Integration prerequisites

- The NAREN REALTY Instagram account must be eligible for Instagram API publishing (Professional account: Business or Creator, subject to Meta's current product requirements).
- Configure a Meta developer app, the required Instagram publishing permissions, account connection, token lifecycle/refresh handling, and any required app review/business verification.
- Store credentials in Vercel server-side environment variables. Do not commit credentials.
- Implement the publishing request server-side. Verify current Meta API version, permissions, media constraints, rate limits, and publishing limits against Meta's official documentation before implementation.
- The media URL must meet Meta's current requirements (publicly fetchable, supported format/aspect ratio/size). Validate before allowing the Admin to publish.

## Acceptance tests

1. Approving a property creates a preview but does not publish anything.
2. Pending/rejected/unpublished/sold listings cannot be published through the normal flow.
3. Preview shows the correct property, approved photos, price/location/details, branding, and public website URL.
4. Admin can edit or cancel the preview before publishing.
5. Only an explicit Admin publish action calls the Instagram publishing API.
6. A successful publish stores the Instagram media ID/permalink and displays Published.
7. A failed API call displays Failed with a safe retry; property approval remains unchanged.
8. Repeated clicks, retries, or duplicate requests do not create duplicate posts.
9. Non-Admin users cannot publish or access integration credentials.
10. No Facebook publishing or weekly scheduling is triggered.

## Delivery status

This document records the approved scope and acceptance criteria only. It does not mean the Meta account is connected, API credentials are configured, code is implemented, or production publishing has been tested.
