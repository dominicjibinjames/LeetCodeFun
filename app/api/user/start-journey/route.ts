import { NextResponse } from "next/server";
import { parseDifficultyMode } from "@/lib/difficulty-mode";
import { parseTrackMode } from "@/lib/track-mode";
import { startJourney } from "@/lib/xp";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      difficulty?: string;
      track?: string;
      restart?: boolean;
    };
    const difficulty = parseDifficultyMode(body.difficulty);
    const track = parseTrackMode(body.track);
    const user = await startJourney({
      difficulty,
      track,
      restart: Boolean(body.restart),
    });
    return NextResponse.json({
      journeyStartedAt: user.journeyStartedAt,
      progressiveUnlock: user.progressiveUnlock,
      journeyDifficulty: user.journeyDifficulty,
      journeyTrack: user.journeyTrack,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to start journey" }, { status: 500 });
  }
}
