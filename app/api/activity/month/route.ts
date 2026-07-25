import { NextResponse } from "next/server";
import { getActivityMonth } from "@/lib/activity";
import { getOrCreateUser } from "@/lib/xp";

export async function GET(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("y"));
    const month = Number(searchParams.get("m"));
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid y/m" }, { status: 400 });
    }
    const activity = await getActivityMonth(
      user.id,
      year,
      month,
      user.journeyStartedAt,
    );
    return NextResponse.json(activity);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
