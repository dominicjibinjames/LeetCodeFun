"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  problemId: string;
  problemTitle: string;
  currentState: string;
};

export function ResetProblemButton({ problemId, problemTitle, currentState }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    const ok = window.confirm(
      `Reset "${problemTitle}"?\n\nThis clears attempts and returns the building to unattempted. XP already earned is kept.`,
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/problems/${problemId}/reset`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Reset failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  if (currentState === "unattempted") {
    return null;
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="btn-ghost text-xs text-[var(--ember)] border-[var(--ember)]/50"
        disabled={busy}
        onClick={reset}
      >
        {busy ? "Resetting…" : "Reset this quest"}
      </button>
      {error ? <p className="text-xs text-[var(--ember)]">{error}</p> : null}
    </div>
  );
}
