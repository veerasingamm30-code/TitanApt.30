# TitanApt Database

## 1. Engine and access

- Database: PostgreSQL 17.
- ORM: Prisma Client 6.19.3.
- Schema: `prisma/schema.prisma`.
- Migration: `prisma/migrations/20261025104433_init`.
- Local development uses the embedded PostgreSQL server on `localhost:55432`.
- Production must use a managed or self-hosted PostgreSQL instance through `DATABASE_URL`.

Two local databases are created automatically:

| Variable | Database | Purpose |
|---|---|---|
| `DATABASE_URL` | `titanapt_dev` | Development and local manual testing |
| `TEST_DATABASE_URL` | `titanapt_test` | Vitest API integration tests |

The test database is migrated and seeded by `apps/api/src/test/global-setup.mjs`. Never point `TEST_DATABASE_URL` at production data.

## 2. Local database lifecycle

`scripts/embedded-db.mjs`:

1. Checks whether port 55432 already has a PostgreSQL listener.
2. Reuses an existing server when present.
3. Initializes `.pgdata/` with bundled PostgreSQL binaries when needed.
4. Starts PostgreSQL and ensures both local databases exist.
5. Returns a stop function.

`scripts/with-db.mjs` starts the server, runs the requested command, then stops the server only if it started it.

Useful commands:

```powershell
npm run setup
npm run db:deploy
npm run db:migrate
npm run db:seed
npm run db:studio
```

`npm run db:migrate` is for development schema changes. Production uses `npm run db:deploy`.

## 3. Model map

### Identity and access

| Model | Purpose |
|---|---|
| `User` | Account identity, normalized email, Argon2 hash, role, login timestamps |
| `UserProfile` | Display name, timezone, daily goal, optional target exam |
| `Session` | Hashed session token, user, creation/last-seen/expiry timestamps |

Roles: `LEARNER`, `REVIEWER`, `ADMIN`.

### Curriculum

| Model | Purpose |
|---|---|
| `Topic` | Published topic, subject, group, order, source note |
| `Lesson` | Structured lesson content, level, status, provenance, review owner |
| `LessonCheckpoint` | Ordered approved questions used to complete a lesson |
| `UserProgress` | Per-user lesson status, best score, attempt count |

### Questions and attempts

| Model | Purpose |
|---|---|
| `Question` | Stem, explanation/reasoning/steps, review status, provenance, fingerprint, company tags, correct option |
| `QuestionOption` | Option label/text; exactly one linked correct option per question |
| `QuestionAttempt` | Immutable answer history with idempotency key and duration |
| `PracticeSession` | Filter snapshot and session lifetime |
| `PracticeSessionQuestion` | Ordered session questions and selected answers |
| `Bookmark` | Unique saved question per learner |
| `QuestionFlag` | Learner-reported question issue and review status |

### Mocks

| Model | Purpose |
|---|---|
| `MockTest` | Title, duration, sections JSON, marking JSON, publication status, source note |
| `MockTestAttempt` | Server deadline, status, score, percentage, timestamps |
| `MockAttemptQuestion` | Ordered attempt questions and saved selections |

### Companies and readiness

| Model | Purpose |
|---|---|
| `Company` | Canonical profile fields, initials mark, topics, provenance, verification date |
| `ResourceChecklistProgress` | Per-user readiness checklist completion |

### Import and audit

| Model | Purpose |
|---|---|
| `ImportSource` | Filename, relative path, SHA-256 checksum, pages, extraction status, licence note |
| `ImportJob` | Status, warnings, page/candidate/approval/skip counts, actor |
| `RawPage` | Extracted page text keyed by source and page number |
| `CandidateQuestion` | Parsed candidate, warnings, status, fingerprint, optional linked question |
| `AdminAuditLog` | Actor, action, target, summary, timestamp |

## 4. Critical invariants

### Question approval gate

Learner-facing queries require:

```text
reviewStatus = APPROVED
AND correctOptionId IS NOT NULL
```

Only the admin review endpoint can approve a question. Approval requires:

- At least two options.
- An existing correct option belonging to that question.
- A non-empty explanation.

Deleting a correct option sets `Question.correctOptionId` to null. Practice and mock selection will then exclude the question.

### Source identity and duplication

- `Question.sourceKey` is unique.
- `Question.fingerprint` is indexed for duplicate detection.
- `CandidateQuestion` is unique by `(jobId, sourceKey)`.
- `ImportSource.checksum` is unique.
- `RawPage` is unique by `(sourceId, pageNumber)`.

The importer checks source key first, then fingerprint. Duplicates are recorded as candidates, not silently dropped.

### Attempt integrity

- `QuestionAttempt` is unique by `(userId, idempotencyKey)`.
- A practice question can only be answered once per session item.
- Mock answers are saved separately before submission.
- Mock submission is idempotent.
- Scores and correctness are calculated server-side.

### Session integrity

- `Session.tokenHash` is unique.
- Sessions cascade-delete with the user.
- Expired sessions are removed when encountered.
- Sessions older than their expiry are rejected.

### Mock question integrity

- `(attemptId, questionId)` and `(attemptId, position)` are unique.
- `(sessionId, questionId)` and `(sessionId, position)` are unique.
- Deleting a question is restricted if attempts or mock items reference it.

## 5. Indexes

Indexes target the common read paths:

- Topics by subject/order.
- Questions by topic/difficulty/review status, review status, and fingerprint.
- Attempts by user/time and user/question/time.
- Sessions by user and expiry.
- Mock attempts by user/time and mock.
- Practice sessions by user/time.
- Flags by status/time.
- Audit logs by time and actor.
- Companies by catalogue order.

## 6. Seed behavior

`prisma/seed.ts` reads:

- `prisma/data/topics.json`
- `prisma/data/lessons.json`
- `prisma/data/companies.json`
- `prisma/data/questions.json`

The seed verifies expected counts before writing:

- 25 topics.
- 25 lessons.
- 25 companies.
- 200 sample questions.

It then seeds:

- 175 approved questions and 25 pending questions.
- 25 lessons with checkpoint links.
- 25 company profiles.
- 2 published mock tests.
- 11 import sources with checksums.
- One admin account from environment credentials when configured.

The seed is idempotent for core content. Re-running it updates published content and admin credentials without duplicating topics, lessons, or companies. It preserves learner progress, attempts, bookmarks, and audit history.

## 7. Test database

`npm test` triggers:

1. `global-setup.mjs` starts embedded PostgreSQL if required.
2. `prisma migrate deploy` against `titanapt_test`.
3. `prisma/seed.ts` against `titanapt_test`.
4. API tests with `NODE_ENV=test` and rate limits disabled.

The test database persists between runs. Tests create unique integration users with UUID emails, so reruns do not collide. The database may accumulate test users, attempts, imports, and audit rows; recreate the test database when a clean baseline is required.

## 8. Production considerations

- Use a dedicated PostgreSQL role with only the privileges required by the application.
- Keep `DATABASE_URL` in a secret manager or protected environment file.
- Enable provider-level backups and point-in-time recovery.
- Apply migrations during a controlled deployment, not from each application instance.
- Monitor connection counts; Prisma uses a connection pool per process.
- Set an appropriate connection limit in the PostgreSQL URL if multiple API instances are used.
- Do not run `prisma migrate dev` against production.
- Do not run `prisma db push` against a database with real data.

## 9. Retention and deletion

The schema uses cascading deletes for sessions, learner-owned attempts, practice data, bookmarks, progress, and readiness records. Questions and mock attempts use restrictive deletion where auditability matters. Production retention policy, account deletion, and legal data-export requirements are not implemented in this build.
