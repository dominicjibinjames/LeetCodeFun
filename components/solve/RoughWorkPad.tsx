"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "patterngard-notes:";

type Props = {
  problemId: string;
  /** Expose current notes for feedback/chat (parent reads via callback). */
  onNotesChange?: (notes: string) => void;
};

export function RoughWorkPad({ problemId, onNotesChange }: Props) {
  const [notes, setNotes] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNotesChangeRef = useRef(onNotesChange);
  onNotesChangeRef.current = onNotesChange;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${problemId}`) ?? "";
      setNotes(raw);
      onNotesChangeRef.current?.(raw);
    } catch {
      setNotes("");
    }
    setHydrated(true);
  }, [problemId]);

  function persist(next: string) {
    setNotes(next);
    onNotesChangeRef.current?.(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${problemId}`, next);
      } catch {
        /* ignore quota */
      }
    }, 300);
  }

  function clear() {
    persist("");
  }

  return (
    <aside
      className="panel flex h-full min-h-0 flex-col gap-2 !p-3"
      aria-label="Rough work notepad"
    >
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-display text-sm tracking-wide">Rough work</h2>
        <button type="button" className="btn-ghost text-[10px] py-0.5 px-2" onClick={clear}>
          Clear
        </button>
      </div>
      <p className="shrink-0 text-[10px] text-[var(--ink-muted)] leading-snug">
        Edge cases · examples · scratch. Saved in this browser for this quest.
      </p>
      <textarea
        value={notes}
        onChange={(e) => persist(e.target.value)}
        disabled={!hydrated}
        placeholder="Write edge cases, tiny examples, or reminders…"
        className="min-h-0 flex-1 resize-none font-mono text-xs leading-relaxed bg-[#fffdf8]/90"
        spellCheck={false}
      />
    </aside>
  );
}

/** Read notes without mounting the pad (e.g. for API payloads). */
export function readRoughWorkNotes(problemId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${problemId}`) ?? "";
  } catch {
    return "";
  }
}
