import { NextResponse } from "next/server";
import { rescheduleBuiltReview } from "@/lib/pathway-reschedule";
import { getOrCreateUser } from "@/lib/xp";

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const body = (await request.json().catch(() => ({}))) as {
    problemId?: string;
    estDay?: string;
  };
  const problemId = typeof body.problemId === "string" ? body.problemId : "";
  const estDay = typeof body.estDay === "string" ? body.estDay : "";
  if (!problemId || !estDay) {
    return NextResponse.json({ error: "problemId and estDay required" }, { status: 400 });
  }

  const result = await rescheduleBuiltReview(user.id, problemId, estDay);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
