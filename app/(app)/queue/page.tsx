import Link from "next/link";
import { DailyQueue } from "@/components/dashboard/DailyQueue";
import { StartJourneyButton } from "@/components/journey/StartJourneyButton";
import { readDifficultyMode } from "@/lib/difficulty-server";
import { readTrackMode } from "@/lib/track-server";
import { getDailyQueue, getOptionalUser, journeyDayNumber } from "@/lib/xp";

export default async function QueuePage() {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <div className="space-y-5 max-w-xl">
        <div>
          <h1 className="text-3xl font-display">Daily Queue</h1>
          <p className="text-[var(--ink-muted)] text-sm mt-1">
            Sign in to receive today’s invaders and review fires. Guests can still explore the map.
          </p>
        </div>
        <a href="/login" className="btn-primary inline-block">
          Sign in
        </a>
        <Link href="/" className="text-sm font-display text-[var(--ember)] underline block">
          Return to the realm
        </Link>
      </div>
    );
  }
  const [difficultyMode, trackMode] = await Promise.all([
    readDifficultyMode(),
    readTrackMode(),
  ]);
  const queue = await getDailyQueue(user.id, difficultyMode, trackMode);
  const dayN = journeyDayNumber(user.journeyStartedAt);

  if (!queue.journeyStarted) {
    return (
      <div className="space-y-5 max-w-xl">
        <div>
          <h1 className="text-3xl font-display">Daily Queue</h1>
          <p className="text-[var(--ink-muted)] text-sm mt-1">
            Start your journey to receive today’s invaders and review fires.
          </p>
        </div>
        <StartJourneyButton started={false} />
        <Link href="/" className="text-sm font-display text-[var(--ember)] underline">
          Return to the realm
        </Link>
      </div>
    );
  }

  const filterNote =
    difficultyMode !== "all" || trackMode !== "all"
      ? [
          difficultyMode !== "all" ? `${difficultyMode} difficulty` : null,
          trackMode !== "all" ? `${trackMode} roadmap` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display">Daily Queue</h1>
        <p className="text-[var(--ink-muted)] text-sm mt-1">
          {dayN != null ? `Day ${dayN}. ` : ""}
          Battle invaders first, then put out fires. Missed invaders become fire the next EST day.
          {filterNote ? (
            <span className="text-[var(--ember)]">
              {" "}
              Showing {filterNote} only — change filters in the header anytime.
            </span>
          ) : null}
        </p>
      </div>
      <DailyQueue
        dueReviews={queue.dueReviews.map((p) => ({
          id: p.id,
          title: p.title,
          district: p.district,
          difficulty: p.difficulty,
          state: p.queueState ?? "fire",
        }))}
        newProblems={queue.newProblems.map((p) => ({
          id: p.id,
          title: p.title,
          district: p.district,
          difficulty: p.difficulty,
          state: p.reviewState?.state ?? "unattempted",
        }))}
      />
    </div>
  );
}
