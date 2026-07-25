import { NextResponse } from "next/server";
import { readDifficultyMode } from "@/lib/difficulty-server";
import { readTrackMode } from "@/lib/track-server";
import { getDailyQueue, getOrCreateUser } from "@/lib/xp";

export async function GET() {
  const user = await getOrCreateUser();
  const [difficultyMode, trackMode] = await Promise.all([
    readDifficultyMode(),
    readTrackMode(),
  ]);
  const queue = await getDailyQueue(user.id, difficultyMode, trackMode);
  return NextResponse.json(queue);
}
