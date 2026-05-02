# Security / Launch Risk Review (May 2, 2026)

Scope reviewed:
- Auth/authz paths, billing webhook handling, abuse controls, and public endpoints.
- Static read-through of selected server routes and middleware.
- Basic test and dependency checks run in this environment.

## Checks run
- `npm test -- --run` ✅ all tests passed.
- `npm audit --json` ⚠️ could not complete due to npm registry advisory endpoint returning HTTP 403 in this environment.

## High-priority risks before real-user launch

### 1) Public endpoint can be abused for low-cost traffic inflation / Redis churn
- `POST /api/current-users` accepts arbitrary `sessionId` from anyone and updates online session state without authentication or rate limiting.
- This can be scripted to inflate active-user metrics and create avoidable Redis write load.

Files:
- `server/api/current-users.post.ts`
- `server/utils/onlineUsers.ts`

Recommendation:
- Add request rate limiting per IP + per sessionId prefix.
- Reject malformed `sessionId` (length/charset constraints).
- Consider signing session IDs server-side (or issuing opaque nonce tokens) if you need trustable analytics.

### 2) Sensitive bot fingerprint data is logged verbatim
- Bot middleware logs full User-Agent strings to stdout.
- User-Agent strings sometimes carry identifying data; this increases privacy and log-handling risk.

File:
- `server/middleware/bot-logger.ts`

Recommendation:
- Redact/hash UA or store only a normalized bot family.
- Ensure log retention and access policies are explicit before marketing scale-up.

## Medium-priority risks

### 3) Some high-traffic flows have commented-out rate-limiting in older endpoints
- There are commented-out rate-limit calls in some endpoints, suggesting old routes may have weaker abuse protections than v2 routes.

Examples:
- `server/api/sentences/v3/start.get.ts`
- `server/api/sentences/topics/v3/start.get.ts`
- `server/api/typing/levels/v2/start.get.ts`
- `server/api/typing/topic/v2/start.get.ts`

Recommendation:
- Confirm these routes are truly unused/deprecated.
- If still routable, either enforce rate limits or remove the endpoints.

### 4) Dependency vulnerability visibility is currently incomplete
- Security advisory fetch failed (`npm audit` 403), so the project currently lacks a verified vulnerability report in this environment.

Recommendation:
- Run dependency scanning in CI using at least one additional source (e.g., GitHub Dependabot alerts / Snyk / osv-scanner).
- Block release on high/critical vulns in production dependencies.

## Good signs observed
- Stripe webhook endpoint verifies signatures before processing and handles duplicate events.
- Authenticated routes use JWT verification via JWKS with issuer/audience checks.
- Core tested units are passing.

## Launch gating checklist (suggested)
1. Protect `/api/current-users` with rate limits and session validation.
2. Reduce bot log verbosity and formalize retention policy.
3. Remove/lock any deprecated public routes with weaker controls.
4. Add automated dependency + SAST scanning in CI and require green status for release.
5. Run a light external pentest (even a 1-day API abuse assessment) before paid acquisition starts.
