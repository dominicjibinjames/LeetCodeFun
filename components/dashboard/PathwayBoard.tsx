"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import type { PathwayDay, PathwayItem, PathwayPayload } from "@/lib/pathway";

function districtLabel(id: string) {
  return id.replace(/_/g, " ");
}

function formatDay(estDay: string) {
  const [y, m, d] = estDay.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function estDayKeySafe(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** ~9:00 America/New_York ISO for optimistic UI (matches server). */
function optimisticDateForEstDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  for (const hour of [13, 14, 12, 15, 16]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
    const key = estDayKeySafe(candidate.toISOString());
    if (key === dayKey) return candidate.toISOString();
  }
  return new Date(Date.UTC(y, m - 1, d, 17, 0, 0)).toISOString();
}

function rebuildHorizon(
  base: PathwayDay[],
  upcoming: PathwayItem[],
  today: PathwayPayload["today"],
): PathwayDay[] {
  const dueByDay = new Map<string, PathwayItem[]>();
  for (const item of upcoming) {
    if (!item.nextReviewDate) continue;
    const key = estDayKeySafe(item.nextReviewDate);
    const list = dueByDay.get(key) ?? [];
    list.push(item);
    dueByDay.set(key, list);
  }
  return base.map((day) => ({
    ...day,
    battles: day.isToday ? today.battles : [],
    fire: day.isToday ? today.fire : [],
    rubble: day.isToday ? today.rubble : [],
    dueReviews: dueByDay.get(day.estDay) ?? [],
  }));
}

function IntervalBadge({ box, intervalDays }: { box: number; intervalDays: number }) {
  if (box <= 0) return null;
  return (
    <span className="rounded border border-[#8b6b3f]/60 bg-[#fff8ee] px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
      box {box} · {intervalDays}d
    </span>
  );
}

function ProblemLink({ item, hint }: { item: PathwayItem; hint?: string }) {
  return (
    <Link
      href={`/problem/${item.problemId}`}
      className="block rounded border border-[#b0893d]/50 px-3 py-2 hover:bg-[#fff8ee]"
    >
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-display text-sm">{item.title}</span>
        <IntervalBadge box={item.box} intervalDays={item.intervalDays} />
      </span>
      <span className="mt-0.5 block text-xs text-[var(--ink-muted)]">
        {districtLabel(item.districtId)}
        {hint ? ` · ${hint}` : ""}
        {item.difficulty ? ` · ${item.difficulty}` : ""}
      </span>
    </Link>
  );
}

function TodayList({
  title,
  empty,
  items,
  hint,
}: {
  title: string;
  empty: string;
  items: PathwayItem[];
  hint?: string;
}) {
  return (
    <section className="panel space-y-3">
      <h2 className="text-xl font-display">
        {title}{" "}
        <span className="text-sm font-normal text-[var(--ink-muted)]">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.problemId}>
              <ProblemLink item={item} hint={hint} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Chip({
  label,
  tone,
  draggable,
  onDragStart,
}: {
  label: string;
  tone: "battle" | "fire" | "rubble" | "due";
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
}) {
  const toneClass =
    tone === "fire"
      ? "border-[#c45c26] text-[#8b2e12] bg-[#fff0e4]"
      : tone === "rubble"
        ? "border-[#6b5a4a] text-[#5c4a3a] bg-[#f0e6d8]"
        : tone === "battle"
          ? "border-[#8b2e12] text-[#8b2e12] bg-[#fff8ee]"
          : "border-[#b0893d] text-[var(--ink)] bg-[#fff8ee] cursor-grab active:cursor-grabbing";
  return (
    <span
      className={`inline-block max-w-full truncate rounded border px-2 py-0.5 text-[11px] font-display ${toneClass} ${
        draggable ? "select-none" : ""
      }`}
      title={draggable ? `${label} — drag to another day` : label}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {label}
    </span>
  );
}

function HorizonRow({
  day,
  dropTarget,
  onDragOverDay,
  onDragLeaveDay,
  onDropDay,
  onDragDue,
}: {
  day: PathwayDay;
  dropTarget: string | null;
  onDragOverDay: (estDay: string, e: DragEvent) => void;
  onDragLeaveDay: (estDay: string) => void;
  onDropDay: (estDay: string, e: DragEvent) => void;
  onDragDue: (problemId: string, e: DragEvent) => void;
}) {
  const isDropHighlight = dropTarget === day.estDay;

  return (
    <div
      className={`rounded border px-3 py-2 transition ${
        isDropHighlight
          ? "border-[var(--ember)] bg-[#fff0e4] ring-1 ring-[var(--ember)]"
          : day.isToday
            ? "border-[var(--ember)] bg-[#fff0e4]/60"
            : "border-[#b0893d]/40 bg-[#fff8ee]/40"
      }`}
      onDragOver={(e) => onDragOverDay(day.estDay, e)}
      onDragLeave={() => onDragLeaveDay(day.estDay)}
      onDrop={(e) => onDropDay(day.estDay, e)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-display text-sm">
          {formatDay(day.estDay)}
          {day.isToday ? (
            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--ember)]">
              Today
            </span>
          ) : null}
          <span className="ml-2 text-[10px] text-[var(--ink-muted)]">
            {day.dueReviews.length +
              day.battles.length +
              day.fire.length +
              day.rubble.length}{" "}
            items
          </span>
        </span>
        <span className="font-display text-[10px] text-[var(--ink-muted)]">{day.estDay}</span>
      </div>
      {day.battles.length === 0 &&
      day.fire.length === 0 &&
      day.rubble.length === 0 &&
      day.dueReviews.length === 0 ? (
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {isDropHighlight ? "Drop here" : "Quiet day — drop a review here"}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {day.battles.map((b) => (
            <Chip key={`b-${b.problemId}`} label={b.title} tone="battle" />
          ))}
          {day.fire.map((f) => (
            <Chip key={`f-${f.problemId}`} label={f.title} tone="fire" />
          ))}
          {day.rubble.map((r) => (
            <Chip key={`r-${r.problemId}`} label={r.title} tone="rubble" />
          ))}
          {day.dueReviews.map((d) => (
            <Chip
              key={`d-${d.problemId}`}
              label={d.title}
              tone="due"
              draggable
              onDragStart={(e) => onDragDue(d.problemId, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PathwayBoard({ data }: { data: PathwayPayload }) {
  const [upcoming, setUpcoming] = useState(data.upcoming);
  const [msg, setMsg] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setUpcoming(data.upcoming);
  }, [data.upcoming]);

  const horizonTemplate = useMemo(
    () =>
      data.horizon.map((d) => ({
        estDay: d.estDay,
        isToday: d.isToday,
        battles: [] as PathwayItem[],
        fire: [] as PathwayItem[],
        rubble: [] as PathwayItem[],
        dueReviews: [] as PathwayItem[],
      })),
    [data.horizon],
  );

  const horizon = useMemo(
    () => rebuildHorizon(horizonTemplate, upcoming, data.today),
    [horizonTemplate, upcoming, data.today],
  );

  const onDragDue = useCallback((problemId: string, e: DragEvent) => {
    e.dataTransfer.setData("text/patterngard-problem", problemId);
    e.dataTransfer.setData("text/plain", problemId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOverDay = useCallback((estDay: string, e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(estDay);
  }, []);

  const onDragLeaveDay = useCallback((estDay: string) => {
    setDropTarget((cur) => (cur === estDay ? null : cur));
  }, []);

  const onDropDay = useCallback(
    (estDay: string, e: DragEvent) => {
      e.preventDefault();
      setDropTarget(null);
      const problemId =
        e.dataTransfer.getData("text/patterngard-problem") ||
        e.dataTransfer.getData("text/plain");
      if (!problemId) return;

      const current = upcoming.find((u) => u.problemId === problemId);
      if (!current?.nextReviewDate) return;
      if (estDayKeySafe(current.nextReviewDate) === estDay) return;

      const prev = upcoming;
      const nextIso = optimisticDateForEstDay(estDay);
      const optimistic = upcoming
        .map((u) =>
          u.problemId === problemId ? { ...u, nextReviewDate: nextIso } : u,
        )
        .sort(
          (a, b) =>
            new Date(a.nextReviewDate ?? 0).getTime() -
            new Date(b.nextReviewDate ?? 0).getTime(),
        );
      setUpcoming(optimistic);
      setMsg(`Moved to ${formatDay(estDay)}…`);

      startTransition(async () => {
        try {
          const res = await fetch("/api/pathway/reschedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ problemId, estDay }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            setUpcoming(prev);
            setMsg(typeof body.error === "string" ? body.error : "Could not reschedule");
            return;
          }
          const confirmedIso =
            typeof body.nextReviewDate === "string" ? body.nextReviewDate : nextIso;
          setUpcoming((cur) =>
            cur
              .map((u) =>
                u.problemId === problemId
                  ? { ...u, nextReviewDate: confirmedIso }
                  : u,
              )
              .sort(
                (a, b) =>
                  new Date(a.nextReviewDate ?? 0).getTime() -
                  new Date(b.nextReviewDate ?? 0).getTime(),
              ),
          );
          setMsg(`Scheduled for ${formatDay(estDay)}.`);
        } catch {
          setUpcoming(prev);
          setMsg("Could not reschedule — try again.");
        }
      });
    },
    [upcoming],
  );

  return (
    <div className="space-y-8">
      <p className="text-sm text-[var(--ink-muted)]">
        Retention ladder: {data.meta.intervals.map((d) => `${d}d`).join(" → ")} (then stay). Fire
        neglected {data.meta.graceDays}+ EST days becomes rubble.
      </p>

      <div>
        <h2 className="mb-3 text-2xl font-display">Today&apos;s call</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <TodayList
            title="Battles"
            empty="No invaders today — the walls hold."
            items={data.today.battles}
            hint="invader"
          />
          <TodayList
            title="Fire"
            empty="No buildings ablaze."
            items={data.today.fire}
            hint="on fire"
          />
          <TodayList
            title="Rubble"
            empty="No rubble to rebuild."
            items={data.today.rubble}
            hint="rubble"
          />
        </div>
      </div>

      <section className="panel space-y-3">
        <h2 className="text-xl font-display">
          Coming up{" "}
          <span className="text-sm font-normal text-[var(--ink-muted)]">({upcoming.length})</span>
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            No scheduled reviews yet. Clear battles and fires to seed the ladder.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((item) => (
              <li key={item.problemId}>
                <div
                  draggable
                  onDragStart={(e) => onDragDue(item.problemId, e)}
                  className="cursor-grab active:cursor-grabbing"
                  title="Drag onto a horizon day to reschedule"
                >
                  <ProblemLink
                    item={item}
                    hint={
                      item.nextReviewDate
                        ? `due ${estDayKeySafe(item.nextReviewDate)}`
                        : "scheduled"
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-display">Horizon</h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Next {data.meta.horizonDays} EST days. Drag due-review chips (or Coming up rows) onto
            another day to balance load. Battles, fire, and rubble cannot be moved.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 font-display text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">
            <span className="rounded border border-[#8b2e12] px-2 py-0.5">Battle</span>
            <span className="rounded border border-[#c45c26] px-2 py-0.5">Fire</span>
            <span className="rounded border border-[#6b5a4a] px-2 py-0.5">Rubble</span>
            <span className="rounded border border-[#b0893d] px-2 py-0.5">Due review (drag)</span>
          </div>
          {msg ? (
            <p className="mt-2 text-xs text-[var(--moss)]">
              {pending ? "Saving… " : ""}
              {msg}
            </p>
          ) : null}
        </div>
        <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1">
          {horizon.map((day) => (
            <HorizonRow
              key={day.estDay}
              day={day}
              dropTarget={dropTarget}
              onDragOverDay={onDragOverDay}
              onDragLeaveDay={onDragLeaveDay}
              onDropDay={onDropDay}
              onDragDue={onDragDue}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
