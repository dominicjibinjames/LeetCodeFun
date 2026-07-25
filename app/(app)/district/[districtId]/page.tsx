import Link from "next/link";
import { notFound } from "next/navigation";
import { DistrictView } from "@/components/map/DistrictView";
import { getDistrict } from "@/lib/districts";
import { tracksForBuildingSlot } from "@/lib/catalog-tracks";
import { ensureTodayConquests, getTodayConquestSlots } from "@/lib/daily-conquest";
import { unlockedDistrictIds } from "@/lib/district-progress";
import { PATTERN_LABELS } from "@/data/districts";
import { guestProblems } from "@/lib/guest-catalog";
import { readDifficultyMode } from "@/lib/difficulty-server";
import { prisma } from "@/lib/prisma";
import { readTrackMode } from "@/lib/track-server";
import { getOptionalUser, syncReviewStates } from "@/lib/xp";

type Props = { params: Promise<{ districtId: string }> };

export default async function DistrictPage({ params }: Props) {
  const { districtId } = await params;
  const district = getDistrict(districtId);
  if (!district) notFound();

  const user = await getOptionalUser();
  if (user) await syncReviewStates(user.id);

  const [difficultyMode, trackMode] = await Promise.all([
    readDifficultyMode(),
    readTrackMode(),
  ]);

  if (user?.journeyStartedAt) {
    await ensureTodayConquests(user.id, difficultyMode, trackMode);
  }

  const allProblems = user
    ? await prisma.problem.findMany({
        where: { userId: user.id },
        include: { reviewState: true },
      })
    : guestProblems();

  const unlocked = unlockedDistrictIds(
    allProblems.map((p) => ({
      district: p.district,
      buildingSlot: p.buildingSlot,
      difficulty: p.difficulty,
      state: p.reviewState?.state ?? "unattempted",
    })),
    difficultyMode,
    trackMode,
    user?.progressiveUnlock ?? true,
    Boolean(user?.journeyStartedAt),
  );

  if (user?.journeyStartedAt && !unlocked.has(districtId)) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-xs font-display text-[var(--ink-muted)] hover:text-[var(--ember)]">
          ← Kingdom
        </Link>
        <h1 className="text-3xl font-display">{district.name}</h1>
        <p className="text-sm text-[var(--ink-muted)] max-w-lg">
          This district is locked. Complete every Built quest in earlier patterns under your current
          difficulty and roadmap filters to open the road here.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Return to the realm
        </Link>
      </div>
    );
  }

  const problems = allProblems
    .filter((p) => p.district === districtId)
    .sort((a, b) => a.title.localeCompare(b.title));

  const invadedSlots = user?.journeyStartedAt
    ? await getTodayConquestSlots(user.id)
    : new Set<string>();

  const mapped = problems.map((p) => ({
    id: p.id,
    title: p.title,
    buildingSlot: p.buildingSlot,
    state: p.reviewState?.state ?? "unattempted",
    difficulty: p.difficulty,
    tracks: tracksForBuildingSlot(p.buildingSlot),
    invaded: invadedSlots.has(p.buildingSlot),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/" className="text-xs font-display text-[var(--ink-muted)] hover:text-[var(--ember)]">
            ← Kingdom
          </Link>
          <h1 className="text-3xl font-display mt-1">{district.name}</h1>
          <p className="text-sm text-[var(--ink-muted)]">
            {district.biome} ·{" "}
            {district.patterns.map((p) => PATTERN_LABELS[p] ?? p).join(", ")}
          </p>
        </div>
        <p className="text-xs text-[var(--ink-muted)]">
          Building outlines off? Retrace silhouettes at{" "}
          <a
            href={`/district-calibrate?district=${district.id}`}
            className="text-[var(--ember)] underline"
          >
            /district-calibrate
          </a>
          .
        </p>
      </div>

      <DistrictView
        districtId={district.id}
        image={district.image}
        districtName={district.name}
        buildings={district.buildings}
        problems={mapped}
      />
    </div>
  );
}
