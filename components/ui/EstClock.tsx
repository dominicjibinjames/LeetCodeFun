"use client";

import { useEffect, useState } from "react";
import { EST_TZ } from "@/lib/activity-time";

/** Realm clock — fixed to America/New_York (EST/EDT). */
export function EstClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="rounded border border-[#b0893d]/45 bg-[#fff8ee]/70 px-2 py-1.5 text-center">
        <div className="font-display text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
          Eastern time
        </div>
        <div className="font-display text-sm tabular-nums text-[var(--ink)]">—:—:—</div>
      </div>
    );
  }

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: EST_TZ,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: EST_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  const zone =
    new Intl.DateTimeFormat("en-US", {
      timeZone: EST_TZ,
      timeZoneName: "short",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "ET";

  return (
    <div
      className="rounded border border-[#b0893d]/45 bg-[#fff8ee]/70 px-2 py-1.5 text-center shadow-sm"
      aria-live="polite"
      title="America/New_York"
    >
      <div className="font-display text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
        {zone} · {date}
      </div>
      <div className="font-display text-base tabular-nums leading-tight text-[var(--ink)] whitespace-nowrap sm:text-lg">
        {time}
      </div>
    </div>
  );
}
