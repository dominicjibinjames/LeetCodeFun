"use client";

import { useMemo } from "react";
import { useDebug } from "@/components/debug/DebugProvider";
import { useDifficulty } from "@/components/difficulty/DifficultyProvider";
import { useTrack } from "@/components/track/TrackProvider";
import type { BuildingProblem } from "@/components/map/DistrictMap";
import { isQuestLocked } from "@/lib/quest-filters";

type Props = {
  districtId: string;
  problems: BuildingProblem[];
  hoveredSlot?: string | null;
  onHoverSlot?: (slot: string | null) => void;
};

function difficultyLabel(difficulty: string) {
  const d = difficulty.toLowerCase();
  if (d === "easy") return "Easy";
  if (d === "medium") return "Medium";
  if (d === "hard") return "Hard";
  return difficulty;
}

function difficultyTone(difficulty: string) {
  const d = difficulty.toLowerCase();
  if (d === "easy") return "text-[var(--moss)]";
  if (d === "medium") return "text-[var(--gold)]";
  if (d === "hard") return "text-[var(--ember)]";
  return "text-[var(--ink-muted)]";
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden
      fill="currentColor"
    >
      <path d="M4.5 7V5.2a3.5 3.5 0 0 1 7 0V7h1.2A1.3 1.3 0 0 1 14 8.3v5.4A1.3 1.3 0 0 1 12.7 15H3.3A1.3 1.3 0 0 1 2 13.7V8.3A1.3 1.3 0 0 1 3.3 7H4.5Zm1.4 0h4.2V5.2a2.1 2.1 0 0 0-4.2 0V7Z" />
    </svg>
  );
}

export function BuildingListWithDebug({
  districtId,
  problems,
  hoveredSlot = null,
  onHoverSlot,
}: Props) {
  const { resolveState } = useDebug();
  const { mode: difficultyMode } = useDifficulty();
  const { mode: trackMode } = useTrack();
  const mapped = useMemo(
    () =>
      problems.map((p) => ({
        ...p,
        state: resolveState(districtId, p.buildingSlot, p.state),
        locked: isQuestLocked(p, difficultyMode, trackMode),
      })),
    [problems, districtId, resolveState, difficultyMode, trackMode],
  );

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {mapped.map((p) => {
        const locked = p.locked;
        const highlighted = hoveredSlot === p.buildingSlot;
        const className = locked
          ? `flex items-center justify-between gap-3 rounded border px-3 py-2 opacity-55 cursor-not-allowed transition ${
              highlighted
                ? "border-[#d4b56a] bg-[#fff8ee]/70 ring-2 ring-[#e0c57a]/70"
                : "border-[#b0893d]/25 bg-[#efe6d4]/40"
            }`
          : `flex items-center justify-between gap-3 rounded border-2 px-3 py-2 transition ${
              highlighted
                ? "border-[#e8c86a] bg-[#fff8ee] shadow-[0_0_0_2px_rgba(224,197,122,0.55)]"
                : "border-[#d4b56a] bg-[#fff8ee]/80 shadow-[0_0_0_1px_rgba(201,168,106,0.35)] hover:bg-[#fff8ee] hover:border-[#e0c57a]"
            }`;

        const hoverHandlers = {
          onMouseEnter: () => onHoverSlot?.(p.buildingSlot),
          onMouseLeave: () => onHoverSlot?.(null),
          onFocus: () => onHoverSlot?.(p.buildingSlot),
          onBlur: () => onHoverSlot?.(null),
        };

        const body = (
          <>
            <span className="min-w-0 flex flex-col gap-0.5">
              <span className="font-display text-sm leading-tight">{p.title}</span>
              <span
                className={`font-display text-[10px] uppercase tracking-wider ${difficultyTone(p.difficulty)}`}
              >
                {difficultyLabel(p.difficulty)}
              </span>
            </span>
            <span className="shrink-0 flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--ink-muted)]">
              {locked ? (
                <>
                  <LockIcon className="text-[var(--ink-muted)]" />
                  Locked
                </>
              ) : (
                p.state
              )}
            </span>
          </>
        );

        return (
          <li key={p.id} data-slot={p.buildingSlot}>
            {locked ? (
              <div
                className={className}
                aria-disabled
                title={`${p.title} — locked by current filters`}
                {...hoverHandlers}
              >
                {body}
              </div>
            ) : (
              <a href={`/problem/${p.id}`} className={className} {...hoverHandlers}>
                {body}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
