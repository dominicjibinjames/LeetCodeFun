# Kingdom of Patterngard

Gamified LeetCode pattern practice: kingdom map → district biomes → explain-first solve flow → Leitner spaced repetition. Buildings construct on first clears, catch fire when reviews are due, and crumble into rubble if forgotten.

![Kingdom map](docs/screenshots/map.png)

## Stack

- Next.js (App Router) + Tailwind
- Prisma 7 + shared Postgres (`@prisma/adapter-pg`)
- Auth.js (GitHub + Google OAuth)
- Gemini (BYO API key per user) for Coach, nudges, use cases, feedback
- Web Push for fire / rubble / daily battle reminders

## Guest vs signed-in

| | Guest | Signed in |
|--|--------|-----------|
| Explore map & solve UI | Yes | Yes |
| Save attempts / SRS / XP | No | Yes |
| Gemini Coach / nudges / use cases | No (offline stubs) | Yes, after adding your Gemini key in Settings |
| Push notifications | No | Opt-in in Settings |

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_*, AUTH_GOOGLE_*
# Optional local: GEMINI_API_KEY (dev fallback only)
# Optional push: VAPID keys + CRON_SECRET

npm run db:up          # if using Docker Postgres
npx prisma migrate deploy
npm run db:seed        # optional local seed user
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Continue as guest** or OAuth on `/login`.

### OAuth callback URLs

- GitHub / Google: `http://localhost:3000/api/auth/callback/github` (and `/google`)
- Production: `https://YOUR_DOMAIN/api/auth/callback/github` (and `/google`)

### VAPID keys (push)

```bash
npx web-push generate-vapid-keys
```

Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key in `VAPID_PRIVATE_KEY`.

## Screenshots

| Screen | Preview |
|--------|---------|
| Realm map | ![Map](docs/screenshots/map.png) |
| District | ![District](docs/screenshots/district.png) |
| Solve flow | ![Solve](docs/screenshots/solve.png) |
| Coach | ![Coach](docs/screenshots/coach.png) |
| Settings | ![Settings](docs/screenshots/settings.png) |

Drop PNGs into `docs/screenshots/` with those filenames (see placeholders in that folder).

## Vercel

1. Create a Neon / Prisma Postgres database → `DATABASE_URL`.
2. Set env vars from `.env.example` (OAuth, `AUTH_SECRET`, `ENCRYPTION_KEY`, VAPID, `CRON_SECRET`).
3. Deploy. Run `npx prisma migrate deploy` against production.
4. Cron: [`vercel.json`](vercel.json) hits `/api/cron/review-reminders` hourly (Authorization: `Bearer CRON_SECRET`).

Problems are seeded **per user on first OAuth login** (not a global seed for all visitors).

## Extending

| Add… | Do this |
|------|---------|
| A problem | Append to [`data/problems/catalog.json`](data/problems/catalog.json), assign `districtId` + unused `buildingSlot`. New users get it on seed; existing users pick it up on next `seedUserProblems` / re-login seed path. |
| A district | Add entry + slots in [`data/districts/`](data/districts/), art under `public/art/`, problems, re-seed users as needed. |

## Docs

- [Design document](docs/DESIGN.md) — product loop, multi-tenant model, AI policy
- [Technical design (TDD)](docs/TDD.md) — Auth.js, encryption, APIs, push, threats

## Folder map

```
app/                 routes + API
auth.ts              Auth.js config
components/          UI (solve/, map/, ui/)
lib/                 prisma, xp, gemini, push, session
data/                catalog + districts
prisma/              schema + migrations
docs/                DESIGN, TDD, screenshots
public/              art, lottie, sw.js
```

## Core loop

1. Identify pattern + justify before code unlocks.
2. Complexity step, then Python IDE (no in-app execution).
3. First solve = timed boss fight; reviews use Leitner boxes.
4. Due → fire. Missed grace or failed review → rubble.
