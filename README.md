# TitanApt

TitanApt is a full-stack aptitude learning and IT-placement preparation platform. It combines verified lesson content, question practice, timed mock tests, a 25-company catalogue, readiness tracking, and an administrative review/import workflow.

The application is built around a provenance-first rule: questions and companies come from the supplied local source material, imported questions remain pending until reviewed, and the product makes no claims about official company papers, logos, vacancies, or placement outcomes.

## Included

- Account signup, signin, logout, sessions, CSRF protection, and role-based access.
- Responsive learner workspace with dashboard, streaks, activity, weak areas, and next-lesson recommendation.
- 25 seeded topics and 25 authored lessons with checkpoints and saved progress.
- Practice engine with topic, subject, difficulty, and company focus, plus recent-question avoidance.
- Timed mock tests with server-authoritative scoring and result review.
- 200-question sample bank: 175 approved questions and 25 pending questions kept out of learner flows.
- 25 company profiles using initials fallbacks because official logo artwork was not supplied.
- Placement-readiness checklist, bookmarks, question flags, progress reporting, and account settings.
- Admin/reviewer desk for question review, flags, bounded PDF imports, mock publishing, and audit history.
- Real PostgreSQL + Prisma persistence, migrations, seed data, tests, and a single-server production build.

## Stack

| Layer | Technology |
|---|---|
| Web | React 19, React Router 7, Vite 6, TypeScript, Lucide icons |
| API | Node.js, Express 4, TypeScript, Zod, Helmet, express-rate-limit |
| Persistence | PostgreSQL 17, Prisma 6, Prisma migrations |
| Auth | Argon2id password hashes, server-stored session-token hashes, double-submit CSRF |
| Extraction | `pdfjs-dist` text-layer extraction with review gates |
| Tests | Vitest, Supertest, Testing Library, isolated PostgreSQL test database |
| Local database | `embedded-postgres` on port `55432` when no local server is running |

## Requirements

- Node.js 20 or newer. The build was verified on Node.js 26.3.0.
- npm 10 or newer.
- No system PostgreSQL or Docker installation is required for local development.
- The supplied PDFs must remain in their original folders if import functionality is needed.

## Local setup

1. Create the environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and set a real `ADMIN_EMAIL`, a long unique `ADMIN_PASSWORD`, and the display name you want. The example database URLs already match the bundled local PostgreSQL instance.

3. Install dependencies, generate Prisma Client, apply the migration, and seed content:

   ```powershell
   npm install
   npm run setup
   ```

4. Start the API and Vite development server:

   ```powershell
   npm run dev
   ```

   - Web: `http://localhost:5173`
   - API and health checks: `http://localhost:4000`
   - The script starts embedded PostgreSQL automatically and stops it when the command exits.

5. Sign in with the admin account from `.env`, or create a learner account at `/signup`.

The local database is stored under `.pgdata/`. It is development data and may be discarded when the app is not running. The embedded database is a local convenience, not a production deployment strategy.

## Commands

| Command | Purpose |
|---|---|
| `npm run setup` | Install-time bootstrap: Prisma generate, migrate, seed |
| `npm run dev` | Start embedded PostgreSQL, API, and web dev server |
| `npm run typecheck` | Type-check shared, API, and web workspaces |
| `npm test` | Run all API and web tests against the isolated test database |
| `npm run build` | Build shared package, API bundle, and production web assets |
| `npm start` | Run the production API bundle; serves `apps/web/dist` when built |
| `npm run smoke` | Exercise a running server over HTTP; set `SMOKE_BASE_URL` if needed |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations without generating a new one |
| `npm run db:seed` | Re-run the idempotent seed |
| `npm run db:studio` | Open Prisma Studio through the embedded database wrapper |
| `npm run import:pdf -- --chapter 2 --limit 20` | Run a bounded PDF import from the command line |

## Production

1. Provision PostgreSQL and set `DATABASE_URL` to the production database.
2. Set `NODE_ENV=production`, `WEB_ORIGIN` to the public web origin, and `COOKIE_SECURE=true`.
3. Set `TRUST_PROXY=true` only when running behind a trusted reverse proxy.
4. Run `npm install`, `npm run build`, and `npm run db:deploy`.
5. Set the admin credentials before seeding, then run `npm run db:seed` once.
6. Start with `npm start`. The API serves the built SPA when `apps/web/dist` exists, or set `WEB_DIST_DIR` to a custom build directory.
7. With the server running, verify the deployment using `npm run smoke`, or set `$env:SMOKE_BASE_URL="https://your-host"` before running it.

Do not use the bundled embedded PostgreSQL setup or the development admin password in production. Back up the production database before migrations.

## Content and import workflow

The initial seed contains a verified sample, not a claim that all 10,000 source questions were imported. The full PDF has 4,939 pages.

Use either:

- **Admin UI:** sign in as an `ADMIN`, open **Admin → Imports**, choose a chapter (`1`–`25`) and a limit (`1`–`100`), then run a bounded import.
- **CLI:** `npm run import:pdf -- --chapter 1 --limit 20`

The importer:

- Resolves chapter page ranges from the PDF outline.
- Extracts text-layer pages only; it does not perform OCR.
- Creates an `ImportSource`, `ImportJob`, raw-page records, question candidates, and review-gated questions.
- Deduplicates by source key and by a normalized fingerprint.
- Creates every new question as `PENDING`. No import automatically enters practice or mock pools.
- Saves candidates that are duplicate, invalid, or need review, with warnings and source-page links.

After an import, review questions in **Admin → Questions**, verify the correct option and explanation, then approve. Reviewers can inspect imports and audit history; only administrators can launch imports.

The importer is synchronous and bounded by design. Importing a chapter with a small limit is fast; full-document extraction remains an operational task, not an automatic bulk approval process.

## Security summary

- Passwords use Argon2id with memory cost 19,456 KiB, time cost 2, and parallelism 1.
- Sessions use 32 random bytes, stored only as SHA-256 hashes; cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Sessions expire after 7 days and slide forward with activity.
- Unsafe `/api` requests require a matching CSRF cookie and `X-CSRF-Token` header.
- Login, signup, auth, general, and write limits are applied in production.
- Helmet sets CSP and browser hardening headers; CORS is restricted to configured origins.
- Admin routes require `ADMIN` or `REVIEWER`; import execution requires `ADMIN`.
- Learner routes only serve approved questions with a verified correct option.
- Audit records capture question reviews, flag changes, mock status changes, and imports.

See [docs/SECURITY.md](docs/SECURITY.md) for details and known gaps.

## Content coverage

- 25 topics across quantitative aptitude, logical reasoning, verbal ability, data interpretation, and technical subjects.
- 25 lessons, one per topic, with checkpoints and Learning Hub source references.
- 200 sample questions, 8 per topic sample, of which 175 are approved.
- 25 canonical companies from `IT_Companies_Guide.pdf`; Zoho profile no. 26 was excluded from the 25-company catalogue.
- 2 published mock tests with positive/negative marking.
- Company marks use typographic initials because the company guide states that no official logo artwork was supplied and forbids imitations.

See [docs/CONTENT_PROVENANCE.md](docs/CONTENT_PROVENANCE.md).

## Verified quality gates

On 2026-10-25:

- `npm run typecheck` passed.
- `npm test` passed 33 tests: 23 API tests and 10 web tests.
- `npm run build` passed.
- A production runtime smoke test passed for SPA fallback, auth/CSRF, learner APIs, practice, company practice, mocks, readiness, and admin authorization.
- Bounded import was exercised against the test database, including idempotent re-runs and admin authorization.

Manual browser visual QA and cross-browser checks are not claimed as complete. See [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Security](docs/SECURITY.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Content provenance](docs/CONTENT_PROVENANCE.md)
- [Test report](docs/TEST_REPORT.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Project audit](docs/PROJECT_AUDIT.md)
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)

## License and source material

The source PDFs and reference media are supplied local project material. This repository is private. No public redistribution rights are implied, no official company branding is included, and the supplied source PDFs remain the authoritative copies.
