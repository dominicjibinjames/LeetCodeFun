import Link from "next/link";
import { PathwayBoard } from "@/components/dashboard/PathwayBoard";
import { StartJourneyButton } from "@/components/journey/StartJourneyButton";
import { readDifficultyMode } from "@/lib/difficulty-server";
import { getPathway } from "@/lib/pathway";
import { readTrackMode } from "@/lib/track-server";
import { getOptionalUser, journeyDayNumber } from "@/lib/xp";

export default async function PathwayPage() {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <div className="space-y-5 max-w-xl">
        <div>
          <h1 className="text-3xl font-display">Pathway</h1>
          <p className="text-[var(--ink-muted)] text-sm mt-1">
            Sign in to see battles, fire, rubble, and your spaced-repetition schedule.
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
  const data = await getPathway(user.id, difficultyMode, trackMode);
  const dayN = journeyDayNumber(user.journeyStartedAt);

  if (!data.journeyStarted) {
    return (
      <div className="space-y-5 max-w-xl">
        <div>
          <h1 className="text-3xl font-display">Pathway</h1>
          <p className="text-[var(--ink-muted)] text-sm mt-1">
            Start your journey to unlock the retention ladder and see what is coming due.
          </p>
        </div>
        <StartJourneyButton started={false} />
        <Link href="/" className="text-sm font-display text-[var(--ember)] underline">
          Return to the realm
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display">Pathway</h1>
        <p className="text-[var(--ink-muted)] text-sm mt-1">
          {dayN != null ? `Day ${dayN}. ` : ""}
          See today&apos;s battles, fires, and rubble — then the reviews scheduled ahead so you
          focus on retention, not re-solving what is already secure.
        </p>
      </div>
      <PathwayBoard data={data} />
    </div>
  );
}
