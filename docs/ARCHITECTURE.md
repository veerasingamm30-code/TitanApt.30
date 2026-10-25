# TitanApt Architecture

## 1. Workspace layout

TitanApt is an npm-workspaces monorepo.

```text
TitanApt/
  apps/
    api/            Express API, Prisma access, PDF extraction, API tests
    web/            React/Vite SPA, route tree, UI tests
  packages/
    shared/         Shared Zod schemas and API-facing TypeScript types
  prisma/           Schema, migration, seed, seed content
  scripts/          Embedded database, bootstrap, import, maintenance
  docs/             Architecture, security, provenance, test evidence
  *.pdf folders/    Untouched source assets
```

Workspaces are declared in the root `package.json`. `@titanapt/shared` must be built before the API consumes its compiled exports. The root `predev` and `build` scripts enforce that order.

## 2. Runtime topology

### Development

```text
Browser -> Vite :5173 -> /api proxy -> Express :4000 -> PostgreSQL :55432
```

- `npm run dev` invokes `scripts/with-db.mjs`.
- The wrapper starts embedded PostgreSQL if nothing is listening on port 55432.
- `concurrently` runs the API with `tsx watch` and the web app with Vite.
- Vite proxies `/api` to the API; cookies remain same-origin from the browser's perspective.
- The wrapper stops the database it started when the dev command exits.

### Production

```text
Browser -> HTTPS reverse proxy -> Express :PORT
                                      |-- /api/* -> API routers
                                      |-- /health/* -> health routers
                                      `-- all other paths -> apps/web/dist/index.html
```

- `npm run build` emits `apps/api/dist/index.js` with tsup and `apps/web/dist` with Vite.
- In production, Express serves the built SPA only when `apps/web/dist` exists or `WEB_DIST_DIR` points to a build.
- Unknown non-API paths fall back to `index.html` for client-side routing.
- `/api` and `/health` paths are never swallowed by the SPA fallback.
- Production requires external PostgreSQL. Embedded PostgreSQL is local-only tooling.

## 3. API layering

| Layer | Responsibility |
|---|---|
| `src/index.ts` | Loads environment, starts HTTP server, handles graceful shutdown |
| `src/app.ts` | Middleware order, security, route mounting, static SPA serving |
| `src/routes/*` | Endpoint definitions, Zod input validation, response shaping |
| `src/middleware/*` | Session attach, authentication/roles, CSRF, request IDs, rate limits |
| `src/lib/*` | Password hashing, sessions, metrics, error types, audit, mock parsing, question views |
| `src/services/*` | PDF question parsing and bounded import orchestration |
| `src/prisma.ts` | Shared Prisma Client instance |

Middleware order in `app.ts` is significant:

1. Request ID generation and response locals.
2. Helmet headers.
3. CORS allowlist with credentials.
4. JSON body parsing with a 64 KiB limit.
5. Cookie parsing.
6. Session loading.
7. Health routes.
8. `/api` general limit and CSRF enforcement.
9. Auth and learner/admin routers.
10. Production SPA static serving.
11. Error handling.

Responses use a uniform envelope:

- Success: `{ "data": ... }`
- Failure: `{ "error": { "code", "message", "details?", "requestId?" } }`

## 4. Frontend structure

- `main.tsx` mounts React inside `BrowserRouter` and `AuthProvider`.
- `App.tsx` owns the route tree and lazy-free page imports.
- Public routes: landing, login, signup, global 404.
- Protected learner routes live under `/app` and require a session.
- Admin routes under `/app/admin` require `ADMIN` or `REVIEWER`.
- `AppShell` supplies sidebar navigation, mobile drawer, skip link, top bar, and content outlet.
- `AuthProvider` bootstraps CSRF, checks `/api/auth/me`, exposes login/signup/logout, and listens for global 401 events.
- `lib/api.ts` wraps fetch, adds CSRF headers to unsafe methods, parses error envelopes, and emits an unauthorized event on 401.
- `useApi` provides loading/error/reload state for read views.
- Pages are grouped by feature: auth, dashboard, learn, practice, mocks, companies, readiness, progress, bookmarks, settings, and admin.

## 5. Practice flow

1. The learner selects topic, subject, difficulty, company, and question count.
2. `POST /api/practice/sessions` validates filters and resolves the approved question pool.
3. Recently answered questions are deprioritized using `NO_REPEAT_DAYS`; repeated questions are used only when the fresh pool is too small.
4. The server persists a `PracticeSession` and ordered `PracticeSessionQuestion` rows.
5. The client receives question views without correct answers.
6. Each answer is checked server-side and written transactionally with an idempotency key.
7. Already-answered questions are rejected unless the same idempotency key is replayed.
8. Session progress is derived from answered rows.

## 6. Mock flow

1. Published mocks define sections, counts, duration, and marking.
2. Starting a mock resumes an unexpired active attempt or creates a new one with a server deadline.
3. Question selection is server-side and filtered to approved questions with verified answers.
4. Answers are stored as they are selected; the client cannot set scores.
5. Submission is idempotent for submitted attempts.
6. Expired attempts can still be scored; answers after the deadline are rejected.
7. Marking supports correct, incorrect, and unanswered values from the mock's marking JSON.
8. Results reveal correct options and explanations only after submission.

## 7. Learning and progress flow

- Topics and lessons are published/approved through seed or admin review.
- Lessons carry structured JSON for examples, rules, mistakes, and practice metadata.
- Checkpoint answers create `QuestionAttempt` records and update `UserProgress`.
- Lesson completion requires the configured checkpoint threshold.
- Dashboard metrics are computed from persisted attempts, lesson progress, mock attempts, and bookmarks.
- Streaks use the learner's profile timezone and local calendar days.
- Weak areas use configurable minimum-attempt and accuracy thresholds.
- The next-lesson recommendation currently chooses the first approved lesson not completed in curriculum order; it is deterministic but not adaptive.

## 8. PDF import pipeline

```text
CLI or admin route
  -> resolve source path and checksum
  -> pdfjs-dist text extraction
  -> resolve outline chapter range
  -> scan pages until the requested limit is exceeded
  -> upsert raw page text
  -> parse Q blocks, options, answer/explanation/steps sections
  -> fingerprint stems + options
  -> create ImportJob + CandidateQuestion rows
  -> create PENDING Question rows when structure is valid
  -> record warnings and completion counts
```

Important properties:

- No OCR is performed.
- The importer is synchronous and bounded; the admin route caps a request at 100 candidates.
- Every new question is `PENDING` with `correctOptionId` set but excluded from learner queries until approved.
- Duplicate source keys and duplicate fingerprints are recorded as candidates rather than new questions.
- Candidate warnings and source pages remain available for review.
- The source PDFs are read-only inputs and are never modified.

## 9. Database access

- Prisma is the only application data-access layer.
- The schema is committed under `prisma/schema.prisma`.
- Migrations are committed under `prisma/migrations`.
- Seed data is idempotent for topics, lessons, companies, mock tests, and import sources.
- Tests use `TEST_DATABASE_URL` and their own global setup, migration, and seed pass.
- The API never uses the test database when `NODE_ENV` is not `test`.

See [DATABASE.md](DATABASE.md).

## 10. Shared contracts

`packages/shared` contains:

- Signup and login validation schemas.
- Public user and API error types.
- Common API-facing primitives.

The API performs authoritative validation; shared schemas keep client and server expectations aligned without trusting client input.

## 11. Testing topology

- Pure API logic: Vitest unit tests for metrics, mock parsing, and PDF parsing.
- HTTP integration: Supertest against the real Express app and real PostgreSQL test database.
- Web logic: Vitest for formatting and API client behavior.
- Production smoke: live server plus HTTP requests for SPA fallback and end-to-end API behavior.

There is no committed browser E2E runner. See [TEST_REPORT.md](TEST_REPORT.md).

## 12. Operational boundaries

- Admin import execution is synchronous. Large batches should be run incrementally by chapter.
- Full 10,000-question extraction is an operational pipeline, not an automatic seed.
- The embedded database is not appropriate for production.
- Official company logos are not included; initials fallbacks are intentional.
- Email verification, password reset, MFA, and self-service account deletion are not implemented.
