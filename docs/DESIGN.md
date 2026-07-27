# Design — Kingdom of Patterngard

## Vision

Turn LeetCode pattern practice into a fantasy kingdom: each problem is a building. Clearing it constructs the building; forgetting reviews sets it on fire, then rubble. The court (morale) and daily invaders reinforce a habit of returning.

## Core loop

1. **Use cases** — business-flavored scenarios (must not spoil the pattern name).
2. **Pattern guess** + justification.
3. **Explain** approach / pseudocode.
4. **Complexity** — time & space claims.
5. **Code** — Python in an IDE-like editor; submit on LeetCode externally.
6. **Log attempt** — XP, Leitner box, map state.

## Multi-tenant model

- **One shared Postgres** for all users (Neon / Prisma Postgres / Vercel Postgres).
- Each OAuth identity maps to a `User` row (`authJsUserId`).
- Problems, attempts, review states, and conquests are always scoped by `userId`.
- First login runs catalog seed for that user only.

## Guest rules

- Guests may browse the map and run the full solve UI against **catalog-backed virtual problems** (`guest_<buildingSlot>` ids).
- Guests **do not** persist attempts, XP, journey, or AI keys.
- Gemini features require **sign-in + BYO Gemini API key** (encrypted).

## AI policy

- Coach / nudges / feedback: short, Socratic; no full pasted solutions unless the user explicitly asks.
- Use cases: describe behavior without naming the interview pattern.
- Production AI uses the user’s key only; `GEMINI_API_KEY` is a local/dev fallback.

## Spaced repetition

Leitner boxes with intervals (1 / 7 / 10 days; cap at 10). Due reviews → fire; grace miss / failed review → rubble; rebuild requires a clean re-solve.

## Notifications

Opt-in Web Push. Daily cron (~8:00 AM Eastern) sends fire / rubble / battle reminders to subscribed users who have something due.

## Non-goals

- Per-user database URLs
- In-browser code judging
- Automatic migration of legacy passphrase single-user progress
