"use client";

import { useMemo } from "react";
import { useDebug } from "@/components/debug/DebugProvider";
import { ActivityCalendar } from "@/components/map/ActivityCalendar";
import type { ActivityDay } from "@/lib/activity-time";

type Mood = "calm" | "grim" | "angry";

type CourtPerson = {
  id: string;
  label: string;
  delay: string;
  role: "royal" | "commoner";
  calm: string;
  low: string;
};

const ROYALS: CourtPerson[] = [
  {
    id: "king",
    label: "King",
    delay: "0s",
    role: "royal",
    calm: "/art/court/king-calm.webp",
    low: "/art/court/king-grim.webp",
  },
  {
    id: "queen",
    label: "Queen",
    delay: "0.35s",
    role: "royal",
    calm: "/art/court/queen-calm.webp",
    low: "/art/court/queen-grim.webp",
  },
  {
    id: "heir",
    label: "Heir",
    delay: "0.7s",
    role: "royal",
    calm: "/art/court/heir-calm.webp",
    low: "/art/court/heir-grim.webp",
  },
];

const COMMONERS: CourtPerson[] = [
  {
    id: "farmer",
    label: "Farmer",
    delay: "0.15s",
    role: "commoner",
    calm: "/art/court/commoner-1-calm.webp",
    low: "/art/court/commoner-1-angry.webp",
  },
  {
    id: "baker",
    label: "Baker",
    delay: "0.5s",
    role: "commoner",
    calm: "/art/court/commoner-2-calm.webp",
    low: "/art/court/commoner-2-angry.webp",
  },
  {
    id: "miller",
    label: "Miller",
    delay: "0.85s",
    role: "commoner",
    calm: "/art/court/commoner-3-calm.webp",
    low: "/art/court/commoner-3-angry.webp",
  },
  {
    id: "shepherd",
    label: "Shepherd",
    delay: "1.1s",
    role: "commoner",
    calm: "/art/court/commoner-4-calm.webp",
    low: "/art/court/commoner-4-angry.webp",
  },
];

function moodFor(morale: number, role: "royal" | "commoner"): Mood {
  if (morale >= 0.65) return "calm";
  if (role === "royal") return "grim";
  return "angry";
}

function srcFor(person: CourtPerson, morale: number): string {
  return morale >= 0.65 ? person.calm : person.low;
}

function CourtFace({
  person,
  morale,
  size,
}: {
  person: CourtPerson;
  morale: number;
  size: "sm" | "md";
}) {
  const mood = moodFor(morale, person.role);
  const src = srcFor(person, morale);
  const dim = size === "md" ? "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" : "h-14 w-14";

  return (
    <figure
      className={`court-figure flex flex-col items-center gap-1 ${
        morale < 0.45 ? "court-face-mood-low" : ""
      }`}
      style={{ animationDelay: person.delay }}
      data-mood={mood}
      data-person={person.id}
    >
      <div className={`court-face-shell ${dim}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${person.label}, ${mood}`} draggable={false} />
      </div>
      <figcaption className="font-display text-[9px] text-[var(--ink-muted)]">
        {person.label}
      </figcaption>
    </figure>
  );
}

type Props = {
  morale: number;
  activityDays: ActivityDay[];
  todayCount: number;
  dailyAsk: number;
  activityYear: number;
  activityMonth: number;
  journeyStartedAt: string | null;
  dayNumber: number | null;
};

export function KingdomCourt({
  morale: realMorale,
  activityDays,
  todayCount,
  dailyAsk,
  activityYear,
  activityMonth,
  dayNumber,
}: Props) {
  const { resolveMorale, debugMode, moraleOverride } = useDebug();
  const morale = resolveMorale(realMorale);

  const headline = useMemo(() => {
    if (morale >= 0.7) return "The realm thrives — spirits are high.";
    if (morale >= 0.4) return "Smoke on the horizon — the court grows uneasy.";
    return "Fires and fear grip the land — faces harden with anger and sorrow.";
  }, [morale]);

  return (
    <aside
      className="panel flex h-full min-h-[280px] flex-col gap-4 !p-3 sm:!p-4"
      aria-label="Royal court and commoners"
    >
      <div>
        <h2 className="font-display text-lg leading-tight">The Court</h2>
        <p className="text-xs text-[var(--ink-muted)] mt-0.5">{headline}</p>
        {dayNumber != null ? (
          <p className="mt-1 font-display text-[10px] uppercase tracking-wide text-[var(--ink)]">
            Journey day {dayNumber}
          </p>
        ) : (
          <p className="mt-1 text-[10px] text-[var(--ink-muted)]">Journey not started</p>
        )}
        {debugMode && moraleOverride != null && (
          <p className="mt-1 font-display text-[10px] uppercase tracking-wide text-[var(--ember)]">
            Debug morale {Math.round(morale * 100)}%
          </p>
        )}
      </div>

      <div>
        <p className="font-display text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-2">
          Royal family
        </p>
        <div className="flex items-end justify-center gap-2 sm:gap-3">
          {ROYALS.map((c) => (
            <CourtFace key={c.id} person={c} morale={morale} size="md" />
          ))}
        </div>
      </div>

      <div className="border-t border-[#b0893d]/35 pt-3">
        <p className="font-display text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-2">
          Common folk
        </p>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {COMMONERS.map((c) => (
            <CourtFace key={c.id} person={c} morale={morale} size="sm" />
          ))}
        </div>
      </div>

      <ActivityCalendar
        days={activityDays}
        todayCount={todayCount}
        dailyAsk={dailyAsk}
        year={activityYear}
        month={activityMonth}
      />
    </aside>
  );
}
