"use client";

import { useRouter } from "next/navigation";
import { useTrack } from "@/components/track/TrackProvider";
import { TRACK_OPTIONS, type TrackMode } from "@/lib/track-mode";

type Props = {
  /** When false, keep the full control but gray out / disable non-selected options. */
  interactive?: boolean;
  value?: TrackMode;
  onChange?: (mode: TrackMode) => void;
};

export function TrackToggle({ interactive = true, value, onChange }: Props) {
  const { mode, setMode } = useTrack();
  const router = useRouter();
  const current = value ?? mode;
  const editable = onChange ? true : interactive;

  function choose(next: TrackMode) {
    if (!editable) return;
    if (onChange) {
      onChange(next);
      return;
    }
    setMode(next);
    router.refresh();
  }

  return (
    <div
      className="inline-flex min-h-[28px] items-center gap-0.5 rounded border border-[#b0893d]/60 bg-[#fff8ee]/90 p-0.5"
      role="group"
      aria-label="Roadmap track"
      title={
        editable
          ? "Filter quests by Beginner or Experienced roadmap"
          : "Journey roadmap locked — enable free roam in Settings to change"
      }
    >
      {TRACK_OPTIONS.map((opt) => {
        const active = current === opt.value;
        const dimmed = !editable && !active;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={!editable}
            onClick={() => choose(opt.value)}
            className={`rounded px-2 py-1 font-display text-[10px] uppercase tracking-wide transition ${
              active
                ? "bg-[var(--ink)] text-[#fff8ee]"
                : dimmed
                  ? "text-[#c4b49a]/55 cursor-default"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
