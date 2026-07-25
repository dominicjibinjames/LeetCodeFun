import { NextResponse } from "next/server";
import { parseDifficultyMode } from "@/lib/difficulty-mode";
import { parseTrackMode } from "@/lib/track-mode";
import { getSessionUser } from "@/lib/session-user";
import { startJourney } from "@/lib/xp";

export async function POST(req: Request) {
  try {
    // #region agent log
    const sessionUser = await getSessionUser();
    fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9e8e6e",
      },
      body: JSON.stringify({
        sessionId: "9e8e6e",
        runId: "pre-fix",
        hypothesisId: "B",
        location: "start-journey/route.ts:POST",
        message: "route reached after middleware",
        data: {
          hasSessionUser: Boolean(sessionUser),
          userIdPrefix: sessionUser?.id?.slice(0, 8) ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
    // #region agent log
    fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9e8e6e",
      },
      body: JSON.stringify({
        sessionId: "9e8e6e",
        runId: "pre-fix",
        hypothesisId: "E",
        location: "start-journey/route.ts:catch",
        message: "startJourney threw",
        data: {
          errName: e instanceof Error ? e.name : "unknown",
          errMsg: e instanceof Error ? e.message : String(e),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error(e);
    return NextResponse.json({ error: "Failed to start journey" }, { status: 500 });
  }
}
