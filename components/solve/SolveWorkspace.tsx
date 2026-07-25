"use client";

import { useState, type ReactNode } from "react";
import { CoachChat } from "@/components/solve/CoachChat";
import { RoughWorkPad } from "@/components/solve/RoughWorkPad";

type Props = {
  problemId: string;
  children: ReactNode;
};

type RailPanel = "notes" | "coach" | null;

/** Viewport height below sticky header (top-20 ≈ 5rem) + padding. */
const RAIL_H = "lg:h-[calc(100vh-6rem)]";

export function SolveWorkspace({ problemId, children }: Props) {
  const [mobilePanel, setMobilePanel] = useState<RailPanel>(null);
  const [railOpen, setRailOpen] = useState<RailPanel>(null);

  function toggleRail(panel: Exclude<RailPanel, null>) {
    setRailOpen((cur) => (cur === panel ? null : panel));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 lg:hidden">
        <button
          type="button"
          className={`btn-ghost text-xs py-1 ${mobilePanel === "notes" ? "ring-1 ring-[var(--ember)]" : ""}`}
          onClick={() => setMobilePanel((v) => (v === "notes" ? null : "notes"))}
        >
          Rough work
        </button>
        <button
          type="button"
          className={`btn-ghost text-xs py-1 ${mobilePanel === "coach" ? "ring-1 ring-[var(--ember)]" : ""}`}
          onClick={() => setMobilePanel((v) => (v === "coach" ? null : "coach"))}
        >
          Coach
        </button>
      </div>

      {mobilePanel === "notes" ? (
        <div className="lg:hidden h-[min(70vh,32rem)]">
          <RoughWorkPad problemId={problemId} />
        </div>
      ) : null}
      {mobilePanel === "coach" ? (
        <div className="lg:hidden h-[min(70vh,32rem)]">
          <CoachChat problemId={problemId} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
        <div className="min-w-0">{children}</div>

        <aside
          className={`hidden lg:flex lg:flex-col lg:sticky lg:top-20 ${RAIL_H} lg:min-h-0 gap-2`}
          aria-label="Solve side panels"
        >
          <RailSection
            title="Rough work"
            open={railOpen === "notes"}
            onToggle={() => toggleRail("notes")}
            expanded={railOpen === "notes"}
          >
            <RoughWorkPad problemId={problemId} />
          </RailSection>

          <RailSection
            title="Coach"
            open={railOpen === "coach"}
            onToggle={() => toggleRail("coach")}
            expanded={railOpen === "coach"}
          >
            <CoachChat problemId={problemId} />
          </RailSection>
        </aside>
      </div>
    </div>
  );
}

function RailSection({
  title,
  open,
  onToggle,
  expanded,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        expanded
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : "shrink-0"
      }
    >
      <button
        type="button"
        className="panel flex w-full items-center justify-between gap-2 !py-2 !px-3 text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="font-display text-sm tracking-wide">{title}</span>
        <span className="text-xs text-[var(--ink-muted)]" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {expanded ? <div className="mt-2 min-h-0 flex-1 overflow-hidden">{children}</div> : null}
    </div>
  );
}
