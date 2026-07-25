"use client";

type Props = {
  label: string;
  remainingSeconds: number;
  totalSeconds: number;
  paused?: boolean;
  onTogglePause?: () => void;
};

export function TimerBar({
  label,
  remainingSeconds,
  totalSeconds,
  paused = false,
  onTogglePause,
}: Props) {
  const pct = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center gap-2 text-sm text-[var(--ink-muted)]">
        <span className="font-display">
          {label}
          {paused ? " · Paused" : ""}
        </span>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
          {onTogglePause ? (
            <button
              type="button"
              className="btn-ghost text-[10px] py-0.5 px-2"
              onClick={onTogglePause}
              aria-pressed={paused}
            >
              {paused ? "Resume" : "Pause"}
            </button>
          ) : null}
        </div>
      </div>
      <div className="hp-track">
        <div
          className="hp-fill"
          style={{ width: `${pct}%`, opacity: paused ? 0.55 : 1 }}
        />
      </div>
    </div>
  );
}
