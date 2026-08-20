# Reborn Tech — Delivery Checklist

- [x] Preserve the existing website as **Reborn Handset Repair Website**; the legacy source is dated, tagged and archived.
- [x] Position the new brand around secure ITAD and second life with the working tagline: **“Secure ITAD. Second life, verified.”**
- [x] Use **Bulk GSM is a Securaze UK partner** as an approved proof point; retain evidence gates for all other standards, licences, logos and data-erasure wording.
- [x] Build the public ITAD-first website, presenting repair as one reuse outcome rather than the primary offer.
- [x] Provision a transparent future customer-portal entry point without implementing authentication or role-based data access.
- [x] Produce the approved impact-film treatment: collection, sorting, secure processing, repair / recycling, redistribution and human outcome.
- [x] Commit and push the completed Reborn Tech website source to the new `reborn-tech` GitHub repository (`main`, commit `131af60`).

## Refinement request — 19 August 2026

- [x] Keep the full desktop navigation visible at tablet widths; move to the hamburger only on narrower mobile devices.
- [x] Restore the original Reborn handset-website logo treatment in the new header and footer.
- [x] Put Signal Lime labels and route accents over a stronger supporting background where needed so they remain clearly visible.
- [x] Produce and integrate the approved collection-to-impact film in place of the hero’s single still image.

## Next approved workstream

- [x] Add a live ITAD assessment form that records customer enquiries and supports operational follow-up.
- [x] Retain the illustrative hero-film sequence rather than replacing it with real Reborn operational footage at this stage.
- [x] Review and approve the final Reborn wordmark / Reborn Tech lock-up: retain the current framed open-loop mark with **REBORN** dominant and smaller **TECH**.

## Hero polish request — 19 August 2026

- [x] Replace the unstable collection shot with a sealed-crate sequence so no laptops can move unnaturally.
- [x] Remove the poster-frame flash between film clips with a single continuous cross-faded film edit.
- [x] Scale the hero panel and typography down with available screen space so each film scene remains visible.

## Identity update — 19 August 2026

- [x] Restore the original Reborn Tech open-loop icon in the header and footer.
- [x] Add a high-contrast background treatment behind the open-loop icon so it reads clearly at all sizes.

## Live ITAD assessment form

- [x] Store customer assessment enquiries securely for Reborn operational follow-up.
- [x] Capture contact, organisation, location, asset scope, collection timing, data-security requirements and optional notes.
- [x] Provide a clear confirmation state and reserve the data model for the later role-based customer / admin portal.

## Trust and conversion expansion

- [x] Define the minimum high-value page structure beyond the homepage, avoiding brochure-style scope creep.
- [x] Keep unverified customer outcomes out of published case studies; use only the clearly labelled Brian Hurting indicative narrative until factual case material is approved.
- [x] Build a verified partner-and-impact evidence section covering StayWell and Securaze UK.
- [x] Publish plain-language privacy and data-handling content aligned with the live assessment form, using the user-confirmed Bulk GSM T/a Reborn controller and 24-month enquiry-review position.

## Approved site expansion

- [x] Add a Services page covering the secure ITAD route and recovery options.
- [x] Add a Security & compliance page for chain of custody, data-erasure evidence and verifiable governance claims.
- [x] Add an Impact & partners page that gives StayWell and Securaze UK suitable evidence-led prominence.
- [x] Reduce the desktop hero text panel so more of the film remains visible.

## Continued evidence-led expansion

- [x] Add a public Reborn capability statement that identifies the Bulk GSM joint venture and the two operating hubs without overstating unverified credentials.
- [x] Strengthen enquiry conversion with clearer service-page routes back to the live assessment intake.
- [x] Add structured placeholders for customer outcome evidence without publishing invented case studies.
- [x] Add a focused public ITAD FAQ to reduce procurement friction around collection, data handling, reuse, recycling and impact routes.

## Privacy and outcome refinement

- [x] Identify the current website controller as Bulk GSM T/a Reborn, with an explicit future-company transition note where appropriate.
- [x] Apply a minimum-purpose enquiry retention position that avoids holding personal enquiry data indefinitely.
- [x] Add an impactful, clearly labelled illustrative customer outcome inspired by Brian Hurting, ready for later factual refinement and approval.

## Operations and document access

- [x] Add a protected Reborn operations dashboard with enquiry search, status management and detailed assessment records.
- [x] Add a smooth, accessible assessment-success animation and clear post-submission confirmation message.
- [x] Publish a downloadable Privacy Information PDF and link it from the public privacy page.

## Operating platform expansion

- [x] Send the project owner an alert when a new ITAD assessment is submitted.
- [x] Add CSV export for the filtered assessment-enquiry queue.
- [x] Add customer organisation roles and a role-based customer portal for collection tracking.
- [x] Enforce distinct customer-portal permissions for organisation admin and viewer roles, with server coverage.
- [x] Give organisation admins a customer-facing viewer-access capability while keeping viewers read-only.
- [x] Prove through server tests that a customer viewer or non-member cannot grant portal access, while an organisation admin can.

## Collection-route attachments

- [x] Store inventory and evidence-file metadata against the relevant collection route.
- [x] Restrict attachment upload and management to Reborn operations admins.
- [x] Give assigned customer organisations scoped, read-only visibility of their route attachments.
- [x] Add upload, download and deletion controls with file-type and size validation.

## Collection audit history

- [x] Store immutable collection audit events for route creation, status changes, customer-access changes and attachment activity.
- [x] Record the acting user, event time, event type and a concise route-specific event summary.
- [x] Show operations users the full route audit history and expose customer-safe operational milestones in the portal.

## Audit timeline navigation

- [x] Add paginated audit-event retrieval for operations and customer-safe portal histories.
- [x] Enhance the audit view with a clear visual timeline, event markers and timeline summary.
- [x] Add accessible previous/next navigation without exposing internal-only events to customers.

## Zero-friction portal redesign

- [x] Replace the customer self-registration prerequisite with a Reborn-created, one-click invitation flow.
- [x] Make the Operations Desk and collection-management entry points discoverable to authenticated Reborn admins.
- [x] Reduce customer onboarding to an invitation email and one-click access to their assigned information.
- [x] Assess available Bulk GSM ITAD source repositories for reusable patterns without coupling Reborn to unrelated legacy code; `bulkgsm/itad-dash` is accessible and its invitation-first concept informed this design.

## True invitation onboarding

- [x] Let an invited customer open a time-limited, token-protected portal route directly from the invitation link without a separate OAuth sign-in step.
- [x] Limit direct invitation access to the invited organisation’s customer-safe collection data and files, with scoped magic-link downloads.
- [x] Validate invitation creation, direct access, invalid-token handling and expiry behaviour through typed API coverage and the live unavailable-link route.
- [x] Add typed API coverage for invalid and expired direct invitation tokens.
- [x] Add typed API coverage proving magic-link document downloads are scoped to customer-visible files in the invited organisation only.
- [x] Prove both permitted and denied magic-link document downloads through typed API tests.

## Shared ITAD platform assessment

- [x] Assess automatic branded email delivery for customer invitations and collection-status notifications.
- [x] Define Operations controls for invitation resend, revoke and expiration-state management.
- [x] Assess the Bulk GSM ITAD Dash architecture and propose a shared multi-tenant backend boundary for Bulk GSM and Reborn.
- [x] Agree the shared-platform implementation plan before merging or restructuring either production backend.

## ITAD Core milestone 1

- [x] Configure automatic branded invitation and collection-status emails from Reborn Tech <reborn@bulkgsm.com>.
- [x] Add Operations controls to resend, revoke and inspect invitation expiration and delivery state.
- [x] Add a shared ITAD Core brand boundary for collection and invitation records usable by both Reborn and Bulk GSM.
- [x] Keep the Reborn user experience separate while preparing its operational core and audit model for multi-brand use.
- [x] Add a canonical shared ITAD Core Job model with schema, migration, helpers and APIs, then connect collection routes to it.
- [x] Implement a Bulk GSM-branded ITAD Dash consumer of the shared Core boundary, without replacing the existing Reborn experience.
- [x] Add tests covering brand isolation across shared-core collections, invitations and direct-link portal access.

## ITAD Core milestone 2 — Core Job depth

- [x] Add brand-scoped Core Job asset-inventory records with structured asset category, quantity and condition fields.
- [x] Add brand-scoped Core Job evidence-certificate records with certificate reference, issuer, verification state and optional secured file attachment.
- [x] Add a validated Securaze import-ready record flow that stores structured import metadata without making unverified erasure claims.
- [x] Build a concise Reborn operations workflow to manage the deeper Core Job records without adding friction to route creation.
- [x] Extend the Bulk GSM ITAD Dash to present the same Core Job record depth in its own brand scope.
- [x] Add API tests for brand isolation, record validation and Core Job evidence access.
