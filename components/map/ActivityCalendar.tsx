"use client";

import { useEffect, useMemo, useState } from "react";
import type { ActivityDay } from "@/lib/activity-time";
import { estDayKey } from "@/lib/activity-time";
import { CALENDAR_MAX, CALENDAR_MIN } from "@/lib/calendar-bounds";

type Props = {
  days: ActivityDay[];
  todayCount: number;
  dailyAsk: number;
  year: number;
  month: number;
};

function level(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

const LEVEL_BG = [
  "bg-[#3a2e24]/12",
  "bg-[#7a9a6a]/55",
  "bg-[#5f8a52]/75",
  "bg-[#3d6b3a]/90",
  "bg-[#2a5528]",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function cmpMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
) {
  return a.year - b.year || a.month - b.month;
}

export function ActivityCalendar({
  days: initialDays,
  todayCount: initialTodayCount,
  dailyAsk: initialDailyAsk,
  year: initialYear,
  month: initialMonth,
}: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState(initialDays);
  const [todayCount, setTodayCount] = useState(initialTodayCount);
  const [dailyAsk, setDailyAsk] = useState(initialDailyAsk);
  const [hover, setHover] = useState<ActivityDay | null>(null);
  const [pending, setPending] = useState(false);
  const today = estDayKey();

  useEffect(() => {
    setYear(initialYear);
    setMonth(initialMonth);
    setDays(initialDays);
    setTodayCount(initialTodayCount);
    setDailyAsk(initialDailyAsk);
  }, [initialYear, initialMonth, initialDays, initialTodayCount, initialDailyAsk]);

  const canPrev = cmpMonth({ year, month }, CALENDAR_MIN) > 0;
  const canNext = cmpMonth({ year, month }, CALENDAR_MAX) < 0;

  const grid = useMemo(() => {
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    const firstKey = days[0]?.date;
    if (!firstKey) return [] as (ActivityDay | null)[];
    const [y, m, d] = firstKey.split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d, 17, 0, 0)).getUTCDay();
    const cells: (ActivityDay | null)[] = [];
    for (let i = 0; i < weekday; i++) cells.push(null);
    for (const day of days) cells.push(byDate[day.date] ?? day);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [days]);

  async function go(delta: number) {
    const next = shiftMonth(year, month, delta);
    if (cmpMonth(next, CALENDAR_MIN) < 0 || cmpMonth(next, CALENDAR_MAX) > 0) return;
    setPending(true);
    try {
      const res = await fetch(`/api/activity/month?y=${next.year}&m=${next.month}`);
      if (!res.ok) return;
      const data = await res.json();
      setYear(data.year);
      setMonth(data.month);
      setDays(data.days);
      setTodayCount(data.todayCount);
      setDailyAsk(data.dailyAsk);
    } finally {
      setPending(false);
    }
  }

  const overtime = Math.max(0, todayCount - dailyAsk);

  return (
    <div className="space-y-2 border-t border-[#b0893d]/35 pt-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-display text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            Quest log
          </p>
          <p className="text-[10px] text-[var(--ink-muted)]">
            Today {todayCount}/{dailyAsk}
            {overtime > 0 ? (
              <span className="text-[var(--moss)]"> · +{overtime} overtime</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-0.5" aria-hidden>
          <span className="text-[9px] text-[var(--ink-muted)] mr-1">Less</span>
          {LEVEL_BG.map((c) => (
            <span key={c} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />
          ))}
          <span className="text-[9px] text-[var(--ink-muted)] ml-1">More</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn-ghost !px-2 !py-0.5 text-[10px]"
          disabled={!canPrev || pending}
          onClick={() => go(-1)}
        >
          ←
        </button>
        <p className="font-display text-xs text-[var(--ink)]">
          {monthLabel(year, month)}
          {pending ? <span className="text-[var(--ink-muted)]"> …</span> : null}
        </p>
        <button
          type="button"
          className="btn-ghost !px-2 !py-0.5 text-[10px]"
          disabled={!canNext || pending}
          onClick={() => go(1)}
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[3px]" role="img" aria-label="Monthly solve activity">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center font-display text-[8px] uppercase text-[var(--ink-muted)]"
          >
            {w[0]}
          </div>
        ))}
        {grid.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} className="h-3 w-full rounded-[2px]" />;
          }
          const lv = level(day.count);
          const isToday = day.date === today;
          const failed = Math.max(0, (day.attempts ?? day.count) - day.count);
          const tip =
            failed > 0
              ? `${day.date}: ${day.count} solve${day.count === 1 ? "" : "s"} · ${failed} attempted`
              : `${day.date}: ${day.count} solve${day.count === 1 ? "" : "s"}`;
          return (
            <button
              key={day.date}
              type="button"
              title={tip}
              className={`h-3 w-full rounded-[2px] ${LEVEL_BG[lv]} ring-1 ${
                isToday ? "ring-[var(--gold)]" : "ring-[#8b6b3f]/20"
              } hover:ring-[var(--gold)]`}
              onMouseEnter={() => setHover(day)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(day)}
              onBlur={() => setHover(null)}
            />
          );
        })}
      </div>

      {hover ? (
        <p className="text-[10px] text-[var(--ink-muted)]">
          {hover.date}: {hover.count} solve{hover.count === 1 ? "" : "s"}
          {Math.max(0, (hover.attempts ?? hover.count) - hover.count) > 0
            ? ` · ${Math.max(0, (hover.attempts ?? hover.count) - hover.count)} attempted`
            : ""}
        </p>
      ) : (
        <p className="text-[10px] text-[var(--ink-muted)]">Hover a day for details</p>
      )}
    </div>
  );
}
