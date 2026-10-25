# TitanApt Implementation Plan

Status vocabulary: PASS, FAIL, PARTIAL, BLOCKED, NOT RUN.

## Milestone order

| # | Milestone | Exit gate | Current status |
|---|---|---|---|
| 1 | Audit and migration decision | `docs/PROJECT_AUDIT.md` written; no destructive action | PASS |
| 2 | Environment, PostgreSQL and Prisma foundation | Migrations applied to a real PostgreSQL test database | PASS |
| 3 | Signup, login, logout and session repair | Auth lifecycle tested, duplicate email blocked, sessions rotate | PASS |
| 4 | Design system, responsive shell, accessible motion | Tokens, shell, focus states, reduced-motion behavior and responsive CSS built | PARTIAL — headless layout audit passed; visual/accessibility QA not complete |
| 5 | Verified Learning Hub | Lessons from validated structured content, checkpoints and saved progress | PASS |
| 6 | PDF inventory, import, provenance and duplicate review | Source manifest, bounded importer, idempotent duplicate handling, review gates | PARTIAL — full 4,939-page import/review remains operational |
| 7 | Practice engine and mock tests | Server-authoritative checking, recent-question avoidance, timed restore, scoring | PASS |
| 8 | Company catalogue and coverflow | 25 canonical companies from database; accessible initials grid fallback | PASS |
| 9 | Dashboard, bookmarks and admin workflows | Metrics from persisted queries; admin authorization and audit tests | PASS |
| 10 | Security, QA, documentation and release report | Release gates evidenced or gaps named | PARTIAL — docs and verification complete; browser QA, CI and production infrastructure remain |

## Dependencies

1. Embedded PostgreSQL runtime before Prisma migration generation.
2. Prisma client generation before API type-check.
3. Seed content (companies, topics, lessons, questions) before dashboard, practice and mock tests can show data.
4. Auth before learner data APIs and admin routes.
5. Shared Zod schemas before both web and API validation.

## Risks

| Risk | Mitigation |
|---|---|
| No system PostgreSQL / Docker | Use `embedded-postgres` for local; keep `DATABASE_URL` standard so production can switch to managed PostgreSQL |
| Node v26 is newer than many packages' tested matrix | Pin stable libraries; verify build and runtime; report any incompatibility |
| Large source PDFs | Seed a provenance-linked sample (8 questions × 25 chapters), retain full source manifest, and provide a bounded importer |
| Official logos absent | Initials fallback with an explicit "official logo not supplied" note |
| Content review claims | Imported questions start pending unless the source check confirms the answer; only approved questions reach learners |
| Browser E2E unavailable | Run unit, integration and HTTP smoke tests; mark Playwright as NOT RUN/BLOCKED with evidence |

## Work ordering

1. Foundation, package manifests, environment, embedded PostgreSQL, Prisma schema, migration.
2. Seed canonical companies from `IT_Companies_Guide.pdf` and approved question sample from `TitanApt_10000.pdf`.
3. API: auth, CSRF, sessions, content, practice, mocks, learner data, companies, analytics, admin.
4. Web: design tokens, shell, landing, auth, learning, practice, mocks, companies, dashboard, admin.
5. Tests: unit pure logic, HTTP integration smoke, manual responsive/accessibility checks.
6. Docs: architecture, database, security, design system, provenance, known limitations, test report, README.

## Current verification

Verified on 2026-10-25:

- `npm run typecheck` PASS.
- `npm test` PASS: 33 tests.
- `npm run build` PASS.
- Bounded PDF import PASS, including idempotent re-runs and admin authorization.
- Production runtime smoke PASS for SPA fallback, auth/CSRF, learner APIs, practice, company practice, readiness, mocks, and admin.
- Headless Edge layout audit PASS across 12 desktop/mobile production routes; a broken direct `/app/dashboard` route was found and fixed.

Detailed evidence is in [TEST_REPORT.md](TEST_REPORT.md).

## Unresolved / conscious gaps

- Full 10,000-question import is out of scope for the initial seed; the app ships a 200-question verified sample plus a real bounded importer.
- Human review of every authored lesson is represented by source provenance to the supplied Learning Hub volumes, not an external reviewer identity.
- No placement outcome, salary, vacancy or official logo claims are made anywhere.
- Browser visual QA, automated accessibility checks, browser E2E, CI, and production infrastructure are not complete. See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).
