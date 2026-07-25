"use client";

import { useEffect, useState } from "react";
import { isSfxMuted, setSfxMuted, unlockAudio } from "@/lib/map-sfx";

function SpeakerIcon({ muted, className }: { muted: boolean; className?: string }) {
  if (muted) {
    return (
      <svg className={className} viewBox="0 0 16 16" aria-hidden fill="currentColor">
        <path d="M2 6.2h2.2L7.5 3.5v9L4.2 9.8H2V6.2Z" />
        <path
          d="M10.2 5.2 14 9m0-3.8-3.8 3.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M2 6.2h2.2L7.5 3.5v9L4.2 9.8H2V6.2Z" />
      <path
        d="M9.4 5.6c1 .8 1.6 1.9 1.6 3.2s-.6 2.4-1.6 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M11.2 3.8c1.6 1.2 2.6 3 2.6 5s-1 3.8-2.6 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Header control — mutes map hover music (fire / battle / rubble). */
export function MuteToggle() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isSfxMuted());
  }, []);

  function toggle() {
    void unlockAudio();
    const next = !muted;
    setMuted(next);
    setSfxMuted(next);
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-[#b0893d]/70 bg-[#fff8ee]/90 px-2 py-0.5 text-[var(--ink)] shadow-sm hover:border-[var(--ember)]"
      aria-pressed={muted}
      aria-label={muted ? "Unmute map music" : "Mute map music"}
      title={muted ? "Unmute" : "Mute"}
      onClick={toggle}
    >
      <SpeakerIcon muted={muted} className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
      <span className="font-display text-[10px] uppercase tracking-wide">
        {muted ? "Muted" : "Sound"}
      </span>
    </button>
  );
}
