# TitanApt Test Report

Date: 2026-10-25  
Workspace: `E:\VEERASINGAM\TitanApt`  
Runtime: Windows, Node.js v26.3.0, npm 11.16.0  
Database: embedded PostgreSQL 17.9 on `localhost:55432`

## 1. Result summary

| Gate | Status | Evidence |
|---|---|---|
| TypeScript typecheck | PASS | Root `npm run typecheck` completed for shared, API, and web |
| API tests | PASS | 4 files, 23 tests |
| Web tests | PASS | 2 files, 10 tests |
| Total automated tests | PASS | 33 tests |
| Production build | PASS | Shared types, API bundle, and Vite SPA built |
| Clean seed baseline | PASS | 25 topics, 25 lessons, 25 companies, 200 questions, 2 mocks |
| Bounded importer | PASS | New pending questions, duplicate re-run, admin-authorized route |
| Production runtime smoke | PASS | Static SPA, auth, learner flows, mocks, readiness, admin |
| Headless browser layout audit | PASS | 12 production routes at 1440px and 390px; no page-level overflow |
| Browser/visual QA | PARTIAL | Rendered checks passed; screenshots were not pixel-reviewed |
| Automated accessibility audit | NOT RUN | No axe/Lighthouse pass recorded |
| Load/soak test | NOT RUN | No load harness configured |

## 2. Typecheck

Command:

```powershell
npm run typecheck
```

Result: PASS.

- `@titanapt/shared`: `tsc --noEmit` passed.
- `@titanapt/api`: `tsc --noEmit` passed.
- `@titanapt/web`: `tsc --noEmit` passed.

## 3. Automated tests

Command:

```powershell
npm test
```

Result: PASS, 33 tests.

### API: 23 tests

| File | Tests | Focus |
|---|---:|---|
| `src/test/http.test.ts` | 7 | Real HTTP integration against isolated PostgreSQL |
| `src/services/pdfQuestionParser.test.ts` | 4 | PDF Q-block parsing, options, answer extraction, warnings |
| `src/lib/metrics.test.ts` | 8 | Accuracy, percentages, streaks, scoring, day boundaries |
| `src/lib/mock.test.ts` | 4 | Mock section and marking JSON parsing |

HTTP integration coverage:

- Database readiness and seeded content counts.
- CSRF rejection for an unsafe request without the header.
- Signup, session bootstrap, learner profile, duplicate email rejection.
- Dashboard data and daily goal.
- 25-topic catalogue, 25-company catalogue, company detail, readiness checklist update.
- Practice session creation, server-checked answer, company-focused practice.
- Practice de-duplication of recently answered questions.
- Mock start, save answer, submit, score.
- Admin denial for a learner.
- Admin login, overview, import registry access.
- Admin-only bounded import execution and duplicate handling.

The API test database is isolated through `TEST_DATABASE_URL`. `global-setup.mjs` starts embedded PostgreSQL, applies migrations, and seeds the test database. The clean baseline run produced:

```text
topics=25 lessons=25 companies=25 questions=200 mocks=2 users=1
```

The test database persists between runs. Integration users use UUID emails to avoid collisions. The database was explicitly reset before the final clean-baseline run.

### Web: 10 tests

| File | Tests | Focus |
|---|---:|---|
| `src/lib/format.test.ts` | 4 | Percentage, duration, date, and label formatting |
| `src/lib/api.test.ts` | 6 | API envelope handling, error mapping, CSRF behavior, idempotency keys |

### Non-failing warnings

- Prisma reports that `package.json#prisma` configuration is deprecated for Prisma 7.
- `scripts/with-db.mjs` triggers Node's `DEP0190` warning because Windows requires `shell: true` to spawn npm/npx commands.
- The expected duplicate-email test causes Prisma to print its unique-constraint error before the API maps it to `409 EMAIL_TAKEN`.

These warnings do not fail the build or tests.

## 4. Production build

Command:

```powershell
npm run build
```

Result: PASS.

| Artifact | Size |
|---|---:|
| API bundle | 97.50 KB |
| API source map | 186.14 KB |
| Web CSS | 95.04 KB, 17.48 KB gzip |
| Web JavaScript | 487.90 KB, 136.59 KB gzip |
| Web source map | 2,176.19 KB |

The web build runs `tsc --noEmit` before Vite. The API build is an ESM bundle produced by tsup.

## 5. Bounded importer verification

### CLI: chapter 1, limit 10

Command shape:

```powershell
npm run import:pdf -- --chapter 1 --limit 10
```

Verified against the isolated test database with:

- 7 pages scanned.
- 10 candidates parsed.
- 2 new questions created as `PENDING`.
- 8 seeded questions skipped as duplicates/source-key matches.
- Import job completed with warnings recorded.

### Idempotent re-run

The same import was repeated:

- 10 candidates parsed.
- 0 new questions.
- 10 skipped as duplicates.

This confirms source-key and fingerprint deduplication.

### Admin route

The HTTP integration suite runs:

```text
POST /api/admin/imports/run { chapter: 2, limit: 5 }
```

It verifies:

- Learner access is denied.
- Admin request returns `201`.
- Chapter 2 is selected.
- 5 candidates are parsed.
- Existing seeded questions are skipped rather than duplicated.
- Pages processed are reported.

### Parser unit tests

The parser test suite verifies:

- Multiple Q blocks parse with options.
- Answer labels map to the correct option.
- Explanation, reasoning, steps, shortcuts, and source-check sections are extracted.
- Missing answer labels produce a warning.

## 6. Production runtime smoke

The final production smoke used:

- `NODE_ENV=production`.
- The built API bundle.
- Built SPA assets served by Express.
- Embedded PostgreSQL local database.
- The committed `scripts/smoke.mjs` HTTP client.

Result: PASS.

Verified:

- `/health/ready` returned database connected and approved content counts.
- `/` and `/app/dashboard` served the SPA HTML through Express.
- CSRF bootstrap and learner signup.
- Session identity via `/api/auth/me`.
- Dashboard daily goal and data.
- 25 topics and 25 companies.
- 10 readiness items.
- Practice session creation and server-checked answer.
- Company practice selection.
- Mock list, start, answer save, and submit with numeric score.
- Learner denial on `/api/admin/overview`.
- Admin login, overview, and import registry.

The smoke run created one development learner and related practice/mock/readiness rows. Smoke runs are intentionally real database writes and are not a substitute for a disposable staging environment.

To repeat against a running server:

```powershell
npm run build
$env:NODE_ENV = 'production'
npm start
# In a second terminal:
npm run smoke
```

`npm run smoke` assumes the server is already running at `SMOKE_BASE_URL` or `http://localhost:4000`.

## 7. Headless browser layout audit

A headless Microsoft Edge session ran against the production build on a separate port because a development server was already using port 4000.

Audited routes, desktop at 1440×900 and mobile at 390×844:

- Landing and sign-in.
- Dashboard, learning hub, companies, and readiness.
- Active practice session and mock catalogue.
- Admin import registry.

Results:

- All routes rendered the expected page rather than a client-side 404.
- No page-level horizontal overflow was detected at either viewport.
- No images were missing `alt` attributes.
- No unexpected console exceptions occurred.
- The only HTTP 401 responses were the expected anonymous `/api/auth/me` probes on landing/sign-in.
- A broken direct `/app/dashboard` route was found on the first pass, fixed by adding the route alias, rebuilt, and re-audited successfully.
- Screenshots were captured for all audited routes, but pixel-level visual review was not completed.

### Still not verified

- Playwright or equivalent multi-browser E2E.
- Pixel-level visual inspection in Chromium, Firefox, Safari, or Edge.
- Screen-reader walkthrough.
- axe/Lighthouse accessibility scoring.
- Zoom, high-contrast, and reduced-motion OS testing.
- Physical mobile device testing.
- Visual regression or screenshot comparison.
- Timed mock countdown and restore behavior through real browser interaction.

No unverified visual or accessibility result is claimed as PASS.

## 8. Environment and data notes

- The workspace is not a Git repository, so no commit-bound CI result exists.
- The local embedded PostgreSQL instance is for development and verification only.
- The test and development databases are separate.
- The clean test seed produced 200 questions: 175 approved and 25 pending.
- The development database was used for production smoke and now contains smoke users/attempts.
- The PDF importer reads source assets from the workspace and was tested with the supplied `TitanApt_10000.pdf`.
- No OCR engine was required for the tested text-layer pages.

## 9. Release position

The implementation is buildable, type-safe, seeded, tested, and runtime-smoke-verified for the exercised server and learner/admin flows.

Remaining release work is documented in [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md), chiefly full-document import/review operations, browser visual and accessibility QA, production infrastructure, and CI.
