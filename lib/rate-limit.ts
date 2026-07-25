import { NextResponse } from "next/server";

/** Simple in-memory sliding window (per serverless isolate). */
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; response: NextResponse } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const prev = (hits.get(key) ?? []).filter((t) => t > windowStart);
  if (prev.length >= limit) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests. Slow down a moment." },
        { status: 429 },
      ),
    };
  }
  prev.push(now);
  hits.set(key, prev);
  return { ok: true };
}
