import { NextResponse } from "next/server";
import { readDifficultyMode } from "@/lib/difficulty-server";
import { getPathway } from "@/lib/pathway";
import { readTrackMode } from "@/lib/track-server";
import { getOrCreateUser } from "@/lib/xp";

export async function GET() {
  const user = await getOrCreateUser();
  const [difficultyMode, trackMode] = await Promise.all([
    readDifficultyMode(),
    readTrackMode(),
  ]);
  const pathway = await getPathway(user.id, difficultyMode, trackMode);
  return NextResponse.json(pathway);
}
