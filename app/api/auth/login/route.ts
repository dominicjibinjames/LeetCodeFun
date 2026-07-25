import { NextResponse } from "next/server";

/** Passphrase login removed — use Auth.js at /api/auth/[...nextauth]. */
export async function POST() {
  return NextResponse.json(
    { error: "Passphrase login removed. Use GitHub/Google on /login." },
    { status: 410 },
  );
}
