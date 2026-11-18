# AI Content Studio — Product & Implementation Specification

## Goal

Build a private AI Reel automation workspace for two independent brands:
1. Personal creator brand: realistic gentleman / luxury lifestyle / GRWM / fashion / travel content, using the creator's approved face reference and voice/avatar.
2. NAREN REALTY: Pune real-estate education, property-market explainers, investment awareness and company-brand content.

The brands must have separate profiles, tone guides, media libraries, connected social accounts, publishing calendars and analytics. Shared infrastructure is allowed; brand data and publishing targets must never be mixed.

## Existing application context

- The existing NAREN REALTY application is a Next.js 16 + React 19 + TypeScript application with Supabase and Vercel.
- Implement this as a new, isolated Admin-only Content Studio module. Do not change public property, listing, owner, customer, broker, or loan workflows.
- Preserve the existing `INSTAGRAM_AUTO_POST_SPEC.md` workflow for approved property-sale listing posts. Content Studio Reels are a separate feature and must not silently alter that workflow.
- Work on branch `feature/ai-content-studio`; do not deploy to production until reviewed and explicitly approved.

## Operating model

Full automation means the system automatically researches, drafts, generates, edits, validates, and queues content. Publishing remains gated by explicit human approval for every post. No post may publish before approval.

## Workflow

1. Research: collect trend signals, topic candidates, competitor/video examples and audience questions from authorized sources. Store source URLs, timestamps and evidence. Never label a topic viral without supporting metrics.
2. Plan: score topic relevance, freshness, audience fit, originality and brand safety; propose a weekly content calendar.
3. Script: generate hook, spoken script, scene plan, on-screen text, CTA, caption and platform-specific metadata.
4. Review script: optional editorial checkpoint before expensive generation; user can edit or regenerate.
5. Generate: use configured avatar/video provider. Personal brand may use the user's approved avatar/face reference. NAREN REALTY uses brand visuals, approved presenters or voiceover; never reuse personal-avatar assets by default.
6. Edit: assemble scenes, voiceover, subtitles, music with commercial-use rights, transitions, cover and 9:16 export.
7. QA: check duration, aspect ratio, audio, subtitle safe zones, spelling, factual claims, brand consistency, copyrighted assets and platform policy.
8. Approval: show final preview, caption, destination accounts and scheduled time. Require explicit approve action.
9. Publish: publish/schedule only after approval, using the selected connected platform/provider. Store platform response and permalink. Use idempotency to prevent duplicate posts.
10. Analyze: collect post metrics where supported and use them to inform future topic scoring.

## Initial platform targets

- Instagram Reels
- YouTube Shorts
- Facebook Reels / Pages only when separately enabled and authorized

Each brand has independent destination account connections. The NAREN REALTY property-listing Instagram auto-post flow remains separate.

## Dashboard modules

- Overview: ideas, scripts, renders, awaiting approval, scheduled, published, failed.
- Brand switcher: Personal Brand / NAREN REALTY.
- Research inbox and trend evidence.
- Content calendar.
- Script and scene editor.
- Render queue and asset library.
- Approval inbox with preview and approve / reject / request changes.
- Publishing history and retry controls.
- Analytics and weekly performance report.
- Integrations and connection health.
- Audit log.

## Suggested data model

- `content_brands`: brand identity, tone, language, visual rules, status.
- `social_accounts`: brand_id, platform, external_account_id, connection status; credentials stored only in server-side secret storage.
- `research_items`: brand_id, topic, evidence URLs, metrics, captured_at, score, status.
- `content_ideas`: brand_id, research_item_id, title, angle, status.
- `content_scripts`: brand_id, idea_id, hook, script, scene_plan, caption, hashtags, version.
- `media_assets`: brand_id, storage path, type, provider reference, rights/consent metadata.
- `video_renders`: brand_id, script_id, provider_job_id, output path, QA status, duration, dimensions.
- `approval_events`: render_id, actor_id, decision, notes, timestamp.
- `publishing_jobs`: render_id, account_id, approved_by, scheduled_at, status, idempotency_key, external_post_id, permalink, error summary.
- `post_analytics`: publishing_job_id, metric snapshot, captured_at.
- `audit_events`: actor, action, entity, timestamp, safe metadata.

All tables must use tenant/brand-aware RLS and Admin-only write permissions. No provider secret or access token may be stored in client-visible rows or returned to browsers.

## Job architecture

Use durable background jobs for research, generation, rendering, QA, publishing and analytics. Jobs must be retryable, idempotent, observable and safe after timeouts. Store state transitions and provider job IDs. Do not run long video generation inside a short-lived request handler.

## Safety and approval rules

- No auto-publishing without explicit approval for each final render and destination account.
- Changing a render, caption, destination or scheduled time after approval invalidates the prior approval.
- Factual real-estate claims must be sourced or clearly framed as opinion/education; no guaranteed returns or misleading appreciation claims.
- No private owner/customer contact details, unpublished property documents or personal data in NAREN REALTY content.
- Face/voice cloning only with the account owner's explicit consent and authorized assets.
- Music, stock footage, fonts and templates must have suitable commercial/social publishing rights.
- Failed publication must not be marked Published; retry must not create duplicates.
- Tokens and API secrets stay server-side, are redacted from logs, and support revocation/reconnection.

## Phased delivery

### Phase 1 — Foundation
- Admin-only dashboard shell and brand switcher.
- Brand profiles and content database schema.
- Research inbox, idea/script editor, approval queue.
- Provider configuration UI and safe server-side secret handling.
- No live publishing.

### Phase 2 — Production pipeline
- Research provider adapters.
- Avatar/video generation adapter.
- Render/edit pipeline and asset storage.
- Automated QA and render preview.

### Phase 3 — Publishing
- Social account OAuth connections.
- Per-account publish/schedule adapter.
- Approval-bound publishing, idempotency, retries and audit log.

### Phase 4 — Analytics and optimization
- Platform metrics ingestion.
- Weekly performance reports and topic scoring.
- Content repurposing and calendar recommendations.

## Acceptance criteria

- Brand assets, prompts, scripts, accounts and analytics remain isolated.
- Admin can research, generate, preview and edit a Reel.
- The system cannot publish before an explicit approval event.
- A changed final asset requires new approval.
- Duplicate publish requests are idempotent.
- Credentials never reach client bundles, database public reads or logs.
- Existing NAREN REALTY features and property-listing Instagram workflow remain unchanged.
- Production readiness is claimed only after provider connections, security tests, platform API tests and end-to-end publishing tests pass.
