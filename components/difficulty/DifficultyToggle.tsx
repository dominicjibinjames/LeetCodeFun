"use client";

import { useRouter } from "next/navigation";
import { useDifficulty } from "@/components/difficulty/DifficultyProvider";
import { DIFFICULTY_OPTIONS, type DifficultyMode } from "@/lib/difficulty-mode";

type Props = {
  /** When false, keep the full control but gray out / disable non-selected options. */
  interactive?: boolean;
  value?: DifficultyMode;
  onChange?: (mode: DifficultyMode) => void;
};

export function DifficultyToggle({
  interactive = true,
  value,
  onChange,
}: Props) {
  const { mode, setMode } = useDifficulty();
  const router = useRouter();
  const current = value ?? mode;
  const editable = onChange ? true : interactive;

  function choose(next: DifficultyMode) {
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
      aria-label="Game difficulty"
      title={
        editable
          ? "Filter quests by difficulty"
          : "Journey difficulty locked — enable free roam in Settings to change"
      }
    >
      {DIFFICULTY_OPTIONS.map((opt) => {
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
                ? "bg-[var(--ember)] text-[#fff8ee]"
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
