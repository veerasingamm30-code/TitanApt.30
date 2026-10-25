# TitanApt Known Limitations

This file lists gaps that are intentionally visible rather than hidden behind completion claims.

## Content

- The seeded bank is a 200-question sample, not a full import of the 4,939-page source PDF.
- 25 sample questions remain pending and are excluded from learner flows until reviewed.
- The importer uses the PDF text layer and does not perform OCR.
- Import depends on the source PDF's outline and question formatting. Layout variants may need parser changes.
- Import is synchronous and bounded. There is no background worker, queue, retry scheduler, or progress streaming.
- Imported questions must be reviewed manually; no candidate is auto-approved.
- The admin UI launches imports from the local registered source and does not provide arbitrary file upload.
- Raw page text and candidate records are stored, but there is no dedicated raw-page reader or side-by-side candidate diff UI.
- Lessons were authored for this build from the Learning Hub material; they are not a verbatim reproduction of the PDFs and have no external reviewer identity.
- Company profiles are static data from the supplied guide. Website details and career links may age and should be re-verified operationally.
- No official company logos are available. Initials fallbacks are intentional and must not be replaced with imitations.
- No claim is made that any mock or question is an official company paper.

## Learning and assessment

- The next-lesson recommendation is deterministic curriculum order, not an adaptive model.
- Recent-question avoidance uses a configurable day window but is not a full spaced-repetition scheduler.
- Weak areas use configured attempt and accuracy thresholds over lifetime attempts; there is no time-decay weighting.
- Mock tests use the seeded section definitions; the admin desk can publish/retire mocks but does not provide a full mock authoring UI.
- A mock cannot start if an approved question pool is too small for its sections.
- There is no proctoring, browser lockdown, anti-cheat, or remote exam mode.
- There is no certificate, leaderboard, social feature, or employer integration.

## Accounts and security

- No email verification.
- No password reset or password change flow.
- No MFA.
- No self-service account deletion or data export.
- No account lockout beyond IP-based request rate limits.
- Rate-limit state is in memory and not shared across multiple API instances.
- No centralized log aggregation, alerting, or SIEM integration.
- No independent penetration test, threat model review, or dependency security audit is recorded.
- Reviewers can currently publish/retire mocks. Confirm or restrict this policy before production.
- The CSRF token is a double-submit random token and is not rotated per request.
- CSP allows inline styles because some UI styling relies on inline attributes.
- Admin account lifecycle is seed/environment-based; there is no admin invitation or role-management UI.

## Operations

- Embedded PostgreSQL is local development tooling only.
- Production deployment, TLS termination, reverse-proxy configuration, backups, monitoring, and secret management are documented but not provisioned by this repository.
- No CI pipeline is committed.
- The workspace is not currently a Git repository, so there is no commit history or automated change review.
- No container image, infrastructure-as-code, or migration rollback playbook is included.
- Import jobs are not resumable after process termination; incomplete jobs can remain in a running state and should be audited.

## Quality assurance

- Playwright/multi-browser E2E is not installed. A headless Edge layout audit was run on 2026-10-25 for 12 production routes at desktop and mobile widths.
- No automated accessibility audit (axe, Lighthouse, or equivalent) is recorded.
- Screenshots were captured but not pixel-reviewed; manual visual QA across real browsers and devices is not complete.
- Cross-browser testing is limited to headless Edge plus typecheck/build and HTTP behavior.
- Bundle size is acceptable but the main web chunk is roughly 488 KiB before gzip; route-level code splitting is not implemented.
- Web unit tests cover formatting and API-client behavior, not every page interaction.
- No load, soak, or concurrency testing is recorded.
- No backup-restore drill is recorded.

## Product scope

- No mobile app.
- No offline/PWA mode.
- No localization or multilingual content.
- No discussion forum, messaging, or mentor workflow.
- No payments or subscription billing.
- No placement guarantee, vacancy feed, salary data, or employer claims.
- No official company affiliation or branding is represented.
