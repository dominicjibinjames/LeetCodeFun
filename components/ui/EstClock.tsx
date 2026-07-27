"use client";

import { useEffect, useState } from "react";
import { EST_TZ } from "@/lib/activity-time";

type Props = {
  timeZone?: string;
};

export function EstClock({ timeZone = EST_TZ }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const tz = timeZone || EST_TZ;

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="rounded border border-[#b0893d]/45 bg-[#fff8ee]/70 px-2 py-1.5 text-center">
        <div className="font-display text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
          Local time
        </div>
        <div className="font-display text-sm tabular-nums text-[var(--ink)]">—:—:—</div>
      </div>
    );
  }

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(now);

  const zone =
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "local";

  return (
    <div
      className="rounded border border-[#b0893d]/45 bg-[#fff8ee]/70 px-2 py-1.5 text-center shadow-sm"
      aria-live="polite"
      title={tz}
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
