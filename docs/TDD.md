# Technical design document (TDD)

## Auth.js

- Package: `next-auth@5` (Auth.js), JWT sessions.
- Providers: GitHub, Google.
- Config: [`auth.ts`](../auth.ts); route: `app/api/auth/[...nextauth]`.
- On first OAuth sign-in: create `User` with `authJsUserId = provider:accountId`, then `seedUserProblems(userId)`.
- Session exposes `appUserId` for Prisma lookups ([`lib/session-user.ts`](../lib/session-user.ts)).

## Middleware

[`middleware.ts`](../middleware.ts) allows all pages for guests. Protected APIs (attempts, user mutations, Gemini proxies, push, queue/activity) require a JWT with `appUserId`.

## Secrets

| Secret | Use |
|--------|-----|
| `AUTH_SECRET` | Auth.js + optional encryption fallback |
| `ENCRYPTION_KEY` | Preferred key for AES-256-GCM of Gemini keys ([`lib/crypto.ts`](../lib/crypto.ts)) |
| User `geminiKeyEncrypted` | Stored ciphertext only; never returned to client |
| VAPID + `CRON_SECRET` | Push + cron auth |

## Gemini resolution

[`lib/gemini.ts`](../lib/gemini.ts) `resolveGeminiApiKey(userId)`:

1. Decrypt user key if present.
2. Else, if `NODE_ENV !== "production"`, use `GEMINI_API_KEY`.
3. Else null → offline stubs.

Chat route rate-limits ~20 req/min/user ([`lib/rate-limit.ts`](../lib/rate-limit.ts)).

## Guest catalog

[`lib/guest-catalog.ts`](../lib/guest-catalog.ts) maps `catalog.json` to virtual problems with ids `guest_<buildingSlot>` and `unattempted` review state.

## Primary APIs

| Route | Auth | Notes |
|-------|------|-------|
| `POST /api/problems/[id]/attempt` | Yes | Persist attempt + SRS |
| `*/use-cases`, `*/nudge`, `*/chat`, `*/feedback` | Yes | Need user; AI needs key |
| `POST/DELETE /api/user/gemini-key` | Yes | Encrypt / clear |
| `POST /api/push/subscribe` | Yes | Store PushSubscription |
| `GET /api/cron/review-reminders` | Cron bearer | Fire/rubble/battle push |

## Push

- Client registers [`public/sw.js`](../public/sw.js), subscribes with VAPID public key.
- Server: [`lib/push.ts`](../lib/push.ts) + `web-push`.
- Cron: [`vercel.json`](../vercel.json) hourly (`0 * * * *`). Each tick notifies users whose local hour matches `notifyHourLocal` (default 8) in their `timezone`.

## Deploy checklist

1. `prisma migrate deploy`
2. Env: DB, Auth.js OAuth, secrets, VAPID, cron
3. OAuth callback URLs for production domain
4. Smoke: guest solve (no save), OAuth seed, Gemini key, attempt log, push subscribe

## Threat model (short)

- Stolen session cookie → account access (httpOnly, secure in prod).
- Stolen Gemini key from DB → mitigated by encryption at rest; protect `ENCRYPTION_KEY`.
- Gemini proxy abuse → auth + rate limits; BYO keys shift quota to users.
- Cron without secret → rejected.
