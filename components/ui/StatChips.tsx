"use client";

type Props = {
  xp: number;
  streakDays: number;
  moralePct: number;
};

function CrestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M8 1.2 12.5 3.5v3.2c0 3.2-2.1 5.6-4.5 6.6C5.6 12.3 3.5 9.9 3.5 6.7V3.5L8 1.2Z" opacity="0.9" />
      <path d="M8 4.2 10.2 5.3v1.7c0 1.5-.9 2.6-2.2 3.1-1.3-.5-2.2-1.6-2.2-3.1V5.3L8 4.2Z" fill="#f3e6c8" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M8 1.5c1.2 1.6 2.8 2.8 2.8 5.1A3.2 3.2 0 0 1 8 14.5 3.2 3.2 0 0 1 5.2 6.6c.7 1.1 1.5 1.5 1.5 1.5S6.2 5.4 8 1.5Z" />
    </svg>
  );
}

function BannerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M3.2 1.5h1.2v13H3.2V1.5Zm2 0h7.6L11.2 5l1.6 3.5H5.2V1.5Z" />
    </svg>
  );
}

export function StatChips({ xp, streakDays, moralePct }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Realm stats">
      <span
        className="inline-flex items-center gap-1 rounded border border-[#b0893d]/70 bg-[#fff8ee]/90 px-2 py-0.5 text-[var(--ink)] shadow-sm"
        title="Experience"
      >
        <CrestIcon className="h-3.5 w-3.5 text-[var(--gold)]" />
        <span className="font-display text-xs tracking-wide">
          XP <span className="tabular-nums">{xp}</span>
        </span>
      </span>
      <span
        className="inline-flex items-center gap-1 rounded border border-[#b0893d]/70 bg-[#fff8ee]/90 px-2 py-0.5 text-[var(--ink)] shadow-sm"
        title="Daily streak"
      >
        <FlameIcon className="h-3.5 w-3.5 text-[var(--ember)]" />
        <span className="font-display text-xs tracking-wide">
          <span className="tabular-nums">{streakDays}</span>d
        </span>
      </span>
      <span
        className="inline-flex items-center gap-1 rounded border border-[#b0893d]/70 bg-[#fff8ee]/90 px-2 py-0.5 text-[var(--ink)] shadow-sm"
        title="Kingdom morale"
      >
        <BannerIcon className="h-3.5 w-3.5 text-[var(--moss)]" />
        <span className="font-display text-xs tracking-wide">
          <span className="tabular-nums">{moralePct}</span>%
        </span>
      </span>
    </div>
  );
}
