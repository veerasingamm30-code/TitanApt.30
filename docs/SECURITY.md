# TitanApt Security

This document describes the security controls implemented in the application and the gaps that remain. It is an engineering summary, not a certification or penetration-test report.

## 1. Authentication

- Passwords are hashed with Argon2id via `@node-rs/argon2`.
- Parameters: memory cost 19,456 KiB, time cost 2, parallelism 1.
- Passwords are never stored, logged, or returned by the API.
- Emails are normalized with NFKC, trimmed, and lowercased for the unique lookup key. The original input is retained separately for display.
- Signup rejects duplicate normalized emails with `409 EMAIL_TAKEN`.
- Login uses a generic failure message for both unknown email and wrong password.
- Unknown-email attempts still verify a dummy Argon2 hash to reduce timing differences.
- Signup creates a learner account and profile in one transaction.
- Login rotates the session token and invalidates the previous browser session when present.
- `lastLoginAt` is updated on successful login.

## 2. Sessions

- Session tokens are 32 random bytes encoded as base64url.
- Only a SHA-256 hash of the token is stored in PostgreSQL.
- The raw token lives in the `ta_session` cookie.
- Cookie attributes:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` when `COOKIE_SECURE=true` or `NODE_ENV=production`
  - `Path=/`
  - 7-day expiry
- Sessions expire seven days after creation or the latest sliding refresh.
- Sessions older than expiry are deleted when encountered.
- The API refreshes `lastSeenAt` at most hourly and extends expiry when less than half the lifetime remains.
- Logout deletes the current stored session and clears the cookie.
- Session attachment runs before API routes; role checks run per router.

No session signing secret is required because tokens are high-entropy random values and only their hashes are stored. Rotating a server secret is not part of the session model.

## 3. CSRF

The API uses a double-submit cookie pattern:

- `GET /api/auth/csrf` issues a random `ta_csrf` cookie and returns the token in the response body.
- The CSRF cookie is readable by JavaScript because the SPA must copy it into `X-CSRF-Token`.
- Every unsafe `/api` request (`POST`, `PUT`, `PATCH`, `DELETE`) must include a header token equal to the cookie token.
- Comparison uses `timingSafeEqual` after a length check.
- Missing or mismatched tokens return `403 CSRF_INVALID`.
- Health endpoints and safe methods are exempt.
- The CSRF cookie is `SameSite=Lax`, `Secure` in production, and expires after seven days.
- The web client fetches a token when absent and attaches it automatically to unsafe requests.

This control complements, rather than replaces, origin checks and SameSite cookies. The API does not implement per-request CSRF token rotation.

## 4. Authorization

Roles:

| Role | Capability |
|---|---|
| `LEARNER` | Own profile, approved content, own practice/mock/progress/bookmarks/flags |
| `REVIEWER` | Learner capabilities plus review desk: questions, flags, mocks, imports read-only, audit |
| `ADMIN` | Reviewer capabilities plus import execution |

- Learner routes require an authenticated session.
- Admin routes require `ADMIN` or `REVIEWER`.
- `POST /api/admin/imports/run` additionally requires `ADMIN`.
- Practice, mock, progress, bookmark, readiness, and profile queries are scoped by `req.user.id`.
- Learner-facing question queries only return approved questions with verified correct options.
- Admin question approval validates the option, explanation, and option count.
- Imported questions are pending by default and excluded from learner pools.
- Admin audit entries record review, flag, mock, and import actions.

Conscious policy gap: reviewers can currently change mock publication status. If mock publication is meant to be administrator-only, restrict that route to `ADMIN`.

## 5. Rate limiting

Rate limits use `express-rate-limit` and are skipped when `NODE_ENV=test`.

| Scope | Window | Limit |
|---|---:|---:|
| General API | 15 minutes | 600 |
| Auth profile | 15 minutes | 30 |
| Login | 15 minutes | 10 |
| Signup | 60 minutes | 10 |
| Write routes | 1 minute | 120 |

Rate-limit responses use the standard error envelope with `429 RATE_LIMITED`. In-memory rate-limit state is per process; multi-instance deployments need a shared store if strict global limits are required.

## 6. HTTP hardening

Helmet sets:

- Content Security Policy with `default-src 'self'`.
- Scripts restricted to same origin.
- Styles restricted to same origin plus inline styles.
- Images restricted to same origin and `data:`.
- Fonts restricted to same origin.
- Connections restricted to same origin and configured trusted origins.
- Objects disabled.
- Framing disabled with `frame-ancestors 'none'`.
- Base URI and form action restricted to self.
- Cross-origin resource policy.
- Strict referrer policy.
- `x-powered-by` disabled.

CORS:

- Allowed origins come from comma-separated `WEB_ORIGIN`.
- Credentials are enabled.
- Only required methods and headers are allowed.

Body parsing is limited to 64 KiB JSON payloads.

## 7. Input and output validation

- API inputs are validated with Zod.
- Shared auth schemas are used by both client and server.
- Query parameters are coerced and bounded where pagination or filters are accepted.
- IDs and filters are passed through Prisma parameterization, not string-concatenated SQL.
- API errors return stable codes and do not include stack traces.
- The production error handler logs server errors without exposing them to clients.
- Question views omit correct answers until an answer or submission response is appropriate.
- Mock results reveal answers only after submission.

## 8. Password and credential handling

- `.env` is ignored and must never be committed.
- `.env.example` contains placeholders, not production credentials.
- Admin credentials come from environment variables at seed time.
- Seeding updates the configured admin password. Protect seed access in production.
- Passwords must be 10–128 characters and include at least one letter and one number.
- No password reset or password change flow is implemented.
- No email verification is implemented.
- No MFA is implemented.
- No account lockout exists beyond IP-based rate limiting.

## 9. Import security

- Import source paths are resolved inside the project or an explicit relative path supplied to the CLI.
- The admin route does not accept arbitrary file paths.
- Only the registered question PDF is imported through the UI.
- Import work is bounded per request.
- Imported content is never auto-approved.
- Raw page text and candidates are stored for review and provenance.
- The source PDF is opened read-only and is never modified.
- PDF extraction uses `isEvalSupported: false`.

## 10. Logging and audit

- Each request receives a request ID.
- Error responses can include the request ID for correlation.
- Admin audit logs record sensitive workflow changes.
- Password values, session tokens, and CSRF tokens are not included in audit summaries.
- No centralized log aggregation or alerting is configured in this build.

## 11. Known security gaps

- No email verification, password reset, MFA, or account deletion.
- No shared rate-limit store for multi-instance deployments.
- No independent penetration test or dependency audit is recorded.
- Reviewers can publish/retire mocks; confirm that this matches the intended policy.
- Admin seed credentials are environment-managed; there is no invitation or admin lifecycle UI.
- CSRF tokens are not rotated per request.
- CSP allows inline styles because the design uses inline style attributes in places; tighten if those are removed.
- Learner question flags are free-text and should be moderated in production.
- The product does not make claims about official company papers or logos; content provenance must remain visible.
