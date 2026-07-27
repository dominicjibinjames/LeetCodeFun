"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  compact?: boolean;
};

export function LeavePathwayButton({ compact = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmLeave() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/leave-journey", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not leave pathway");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not leave pathway");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "btn-ghost text-xs py-1 w-full" : "btn-primary"}
        onClick={() => setOpen(true)}
      >
        Leave this pathway
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2118]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-pathway-title"
        >
          <div className="w-full max-w-sm rounded border border-[#b0893d] bg-[#f3e6c8] p-5 shadow-xl space-y-4">
            <h2 id="leave-pathway-title" className="font-display text-xl text-[var(--ink)]">
              Leave this pathway?
            </h2>
            <p className="text-sm text-[var(--ink-muted)]">
              Your built buildings, XP, and streak are kept. Today&apos;s invaders will be cleared.
              You&apos;ll return to the journey selection screen to pick a new pathway whenever
              you&apos;re ready.
            </p>
            {error ? <p className="text-xs text-[var(--ember)]">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-ghost text-sm"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={busy}
                onClick={confirmLeave}
              >
                {busy ? "Leaving…" : "Leave pathway"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
