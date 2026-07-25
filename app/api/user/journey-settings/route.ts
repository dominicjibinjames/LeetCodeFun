import { NextResponse } from "next/server";
import { getOrCreateUser, setProgressiveUnlock } from "@/lib/xp";

export async function GET() {
  const user = await getOrCreateUser();
  return NextResponse.json({
    progressiveUnlock: user.progressiveUnlock,
    journeyStartedAt: user.journeyStartedAt,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    progressiveUnlock?: boolean;
  };
  if (typeof body.progressiveUnlock !== "boolean") {
    return NextResponse.json(
      { error: "progressiveUnlock boolean required" },
      { status: 400 },
    );
  }
  const user = await setProgressiveUnlock(body.progressiveUnlock);
  return NextResponse.json({
    progressiveUnlock: user.progressiveUnlock,
    journeyStartedAt: user.journeyStartedAt,
  });
}
