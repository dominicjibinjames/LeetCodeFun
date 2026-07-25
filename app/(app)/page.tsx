import { KingdomCourt } from "@/components/map/KingdomCourt";
import { KingdomMap } from "@/components/map/KingdomMap";
import { StartJourneyButton } from "@/components/journey/StartJourneyButton";
import { EstClock } from "@/components/ui/EstClock";
import { getActivityMonth } from "@/lib/activity";
import { ensureTodayConquests, getTodayConquestSlots } from "@/lib/daily-conquest";
import { unlockedDistrictIds } from "@/lib/district-progress";
import { getDistricts } from "@/lib/districts";
import { readDifficultyMode } from "@/lib/difficulty-server";
import { estDayKey } from "@/lib/activity-time";
import { readTrackMode } from "@/lib/track-server";
import { getUserProblemProgress } from "@/lib/user-progress";
import {
  computeMorale,
  getOptionalUser,
  journeyDayNumber,
} from "@/lib/xp";
import { guestProblems } from "@/lib/guest-catalog";

type Props = { searchParams: Promise<{ calY?: string; calM?: string }> };

export default async function KingdomPage({ searchParams }: Props) {
  // #region agent log
  const t0 = Date.now();
  // #endregion
  const user = await getOptionalUser();
  const districts = getDistricts();
  const [difficultyMode, trackMode] = await Promise.all([
    readDifficultyMode(),
    readTrackMode(),
  ]);
  const params = await searchParams;

  if (user?.journeyStartedAt) {
    await ensureTodayConquests(user.id, difficultyMode, trackMode);
  }

  const problems = user ? await getUserProblemProgress(user.id) : guestProblems();

  const reviewStates = user
    ? problems.map((p) => p.reviewState).filter(Boolean)
    : [];
  const morale = user ? computeMorale(reviewStates as { state: string }[]) : 1;
  const todayKey = estDayKey();
  const [ty, tm] = todayKey.split("-").map(Number);
  const calY = Number(params.calY) || ty;
  const calM = Number(params.calM) || tm;
  const activity = user
    ? await getActivityMonth(user.id, calY, calM, user.journeyStartedAt)
    : {
        year: calY,
        month: calM,
        days: [] as { date: string; count: number; attempts: number }[],
        todayCount: 0,
        dailyAsk: 0,
      };
  const invadedSlots =
    user?.journeyStartedAt ? await getTodayConquestSlots(user.id) : new Set<string>();
  const dayN = journeyDayNumber(user?.journeyStartedAt ?? null);
  const progressiveUnlock = user?.progressiveUnlock ?? true;
  const journeyStarted = Boolean(user?.journeyStartedAt);
  const streakDays = user?.streakDays ?? 0;
  const xp = user?.xp ?? 0;

  const progress = problems.map((p) => ({
    district: p.district,
    buildingSlot: p.buildingSlot,
    difficulty: p.difficulty,
    state: p.reviewState?.state ?? "unattempted",
  }));
  const unlocked = unlockedDistrictIds(
    progress,
    difficultyMode,
    trackMode,
    progressiveUnlock,
    journeyStarted,
  );

  const invadersRemaining = problems.filter(
    (p) =>
      invadedSlots.has(p.buildingSlot) &&
      (p.reviewState?.state ?? "unattempted") === "unattempted",
  ).length;

  const stats = districts.map((d) => {
    const dp = problems.filter((p) => p.district === d.id);
    const states = dp.map((p) => p.reviewState?.state ?? "unattempted");
    const built = states.filter((s) => s === "built").length;
    const fire = states.filter((s) => s === "fire").length;
    const rubble = states.filter((s) => s === "rubble").length;
    const hasInvaders = dp.some(
      (p) =>
        invadedSlots.has(p.buildingSlot) &&
        (p.reviewState?.state ?? "unattempted") === "unattempted",
    );
    return {
      id: d.id,
      name: d.name,
      mastery: dp.length ? built / dp.length : 0,
      hasSmoke: fire > 0,
      hasRubble: rubble > 0,
      hasInvaders,
      locked: journeyStarted && !unlocked.has(d.id),
      built,
      total: dp.length,
    };
  });

  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "9e8e6e",
    },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "perf",
      hypothesisId: "P",
      location: "page.tsx:kingdom",
      message: "kingdom page timing",
      data: {
        ms: Date.now() - t0,
        signedIn: Boolean(user),
        problemCount: problems.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <h1 className="text-3xl md:text-4xl font-display">The Realm</h1>
          <p className="text-[var(--ink-muted)] max-w-2xl">
            Thirteen districts. One pattern each. Hover a territory to light it up — invaders mark
            today’s battles, fire marks missed campaigns, and rubble follows three days of neglect.
          </p>
          {journeyStarted && dayN != null ? (
            <p className="font-display text-sm text-[var(--ink)]">
              Day {dayN}
              <span className="text-[var(--ink-muted)]">
                {" "}
                · {invadersRemaining} invader{invadersRemaining === 1 ? "" : "s"} remaining today ·{" "}
                {streakDays} day streak · {xp} XP
              </span>
            </p>
          ) : user ? (
            <StartJourneyButton started={false} />
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">
              <a href="/login" className="text-[var(--ember)] underline font-display">
                Sign in
              </a>{" "}
              to start a journey and save progress. Guests can explore every district.
            </p>
          )}
          <p className="text-xs text-[var(--ink-muted)]">
            Borders look off? Retrace them at{" "}
            <a href="/map-calibrate" className="text-[var(--ember)] underline">
              /map-calibrate
            </a>
            .
          </p>
        </div>
        <EstClock />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(240px,0.7fr)] lg:items-stretch">
        <KingdomMap districts={districts} stats={stats} morale={morale} />
        <KingdomCourt
          morale={morale}
          activityYear={activity.year}
          activityMonth={activity.month}
          activityDays={activity.days}
          todayCount={activity.todayCount}
          dailyAsk={activity.dailyAsk}
          journeyStartedAt={user?.journeyStartedAt?.toISOString() ?? null}
          dayNumber={dayN}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) =>
          s.locked ? (
            <div key={s.id} className="panel !p-3 opacity-50">
              <div className="font-display">{s.name}</div>
              <div className="text-xs text-[var(--ink-muted)] mt-1">
                Locked — finish earlier patterns first
              </div>
              <div className="mt-2 h-1.5 rounded bg-[#3a2e24]/30 overflow-hidden">
                <div
                  className="h-full bg-[var(--moss)]"
                  style={{ width: `${Math.round(s.mastery * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <a
              key={s.id}
              href={`/district/${s.id}`}
              className="panel !p-3 hover:ring-1 hover:ring-[var(--gold)] transition"
            >
              <div className="font-display">{s.name}</div>
              <div className="text-xs text-[var(--ink-muted)] mt-1">
                {s.built}/{s.total} built
                {s.hasInvaders ? " · invaders" : ""}
                {s.hasSmoke ? " · smoke on the horizon" : ""}
                {s.hasRubble ? " · rubble" : ""}
              </div>
              <div className="mt-2 h-1.5 rounded bg-[#3a2e24]/30 overflow-hidden">
                <div
                  className="h-full bg-[var(--moss)]"
                  style={{ width: `${Math.round(s.mastery * 100)}%` }}
                />
              </div>
            </a>
          ),
        )}
      </div>
    </div>
  );
}
