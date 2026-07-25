import { NextResponse } from "next/server";
import { resetKingdomProgress } from "@/lib/xp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "RESET") {
    return NextResponse.json(
      { error: 'Type confirm: "RESET" to wipe kingdom progress' },
      { status: 400 },
    );
  }

  try {
    const result = await resetKingdomProgress();
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to reset kingdom" }, { status: 500 });
  }
}
