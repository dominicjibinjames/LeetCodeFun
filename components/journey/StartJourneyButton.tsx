"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDifficulty } from "@/components/difficulty/DifficultyProvider";
import { DifficultyToggle } from "@/components/difficulty/DifficultyToggle";
import { useTrack } from "@/components/track/TrackProvider";
import { TrackToggle } from "@/components/track/TrackToggle";
import type { DifficultyMode } from "@/lib/difficulty-mode";
import type { TrackMode } from "@/lib/track-mode";

type Props = {
  started: boolean;
  /** Prior journey finished or leaving mid-path — pick new difficulty/track without wiping builds. */
  restart?: boolean;
  /** Mid-journey abandon (vs finishing a filter set). Only affects copy. */
  leavePathway?: boolean;
  label?: string;
};

export function StartJourneyButton({
  started,
  restart = false,
  leavePathway = false,
  label,
}: Props) {
  const router = useRouter();
  const { mode: difficultyMode, setMode: setDifficulty } = useDifficulty();
  const { mode: trackMode, setMode: setTrack } = useTrack();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickDifficulty, setPickDifficulty] = useState<DifficultyMode>(difficultyMode);
  const [pickTrack, setPickTrack] = useState<TrackMode>(trackMode);

  useEffect(() => {
    if (!open) return;
    setPickDifficulty(difficultyMode);
    setPickTrack(trackMode);
  }, [open, difficultyMode, trackMode]);

  if (started && !restart) return null;

  async function confirmStart() {
    setBusy(true);
    setError(null);
    try {
      setDifficulty(pickDifficulty);
      setTrack(pickTrack);
      const res = await fetch("/api/user/start-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulty: pickDifficulty,
          track: pickTrack,
          restart,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not start journey");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start journey");
    } finally {
      setBusy(false);
    }
  }

  const buttonLabel =
    label ??
    (leavePathway
      ? "Leave this pathway"
      : restart
        ? "Start another journey"
        : "Start your journey");

  const dialogTitle = leavePathway
    ? "Leave pathway & choose another"
    : restart
      ? "Choose your next journey"
      : "Choose your journey";

  const confirmLabel = leavePathway
    ? "Leave & begin anew"
    : restart
      ? "Begin next journey"
      : "Begin Day 1";

  return (
    <div className="space-y-2">
      <button type="button" className="btn-primary" disabled={busy} onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      {!restart ? (
        <p className="text-xs text-[var(--ink-muted)] max-w-md">
          Begin Day 1. Each EST day brings up to three foreign invaders to battle. Miss them and
          their camps catch fire; leave fires for three days and buildings crumble to rubble.
        </p>
      ) : leavePathway ? (
        <p className="text-xs text-[var(--ink-muted)] max-w-md">
          Switch difficulty or roadmap without wiping the kingdom. Built buildings stay; today&apos;s
          invaders re-roll for the new path. Fire and rubble you already have still need clearing.
        </p>
      ) : (
        <p className="text-xs text-[var(--ink-muted)] max-w-md">
          This filter set is complete across the kingdom. Choose Medium, Hard, or another roadmap to
          continue — built quests stay built.
        </p>
      )}
      {error && !open ? <p className="text-xs text-[var(--ember)]">{error}</p> : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a2118]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-journey-title"
        >
          <div className="w-full max-w-md rounded border border-[#b0893d] bg-[#f3e6c8] p-5 shadow-xl space-y-4">
            <div>
              <h2 id="start-journey-title" className="font-display text-xl text-[var(--ink)]">
                {dialogTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                {leavePathway
                  ? "Your built progress is kept. Filters lock again under progressive mode until you finish the new set — or use free roam in Settings."
                  : "These filters stay locked until you finish every matching quest in every district — or enable free roam in Settings to pick freely from the header."}
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-display text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                Difficulty
              </p>
              <DifficultyToggle value={pickDifficulty} onChange={setPickDifficulty} />
            </div>

            <div className="space-y-2">
              <p className="font-display text-xs uppercase tracking-wide text-[var(--ink-muted)]">
                Roadmap
              </p>
              <TrackToggle value={pickTrack} onChange={setPickTrack} />
            </div>

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
                onClick={confirmStart}
              >
                {busy ? "Mustering the realm…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
