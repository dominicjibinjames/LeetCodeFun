"use client";

import Link from "next/link";

type Item = {
  id: string;
  title: string;
  district: string;
  difficulty?: string;
  state?: string;
};

type Props = {
  dueReviews: Item[];
  newProblems: Item[];
};

export function DailyQueue({ dueReviews, newProblems }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="panel space-y-3">
        <h2 className="text-xl font-display">Reviews due</h2>
        {dueReviews.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No fires to put out. The realm is calm.</p>
        ) : (
          <ul className="space-y-2">
            {dueReviews.map((p) => (
              <li key={p.id}>
                <Link href={`/problem/${p.id}`} className="block rounded border border-[#b0893d]/50 px-3 py-2 hover:bg-[#fff8ee]">
                  <span className="font-display text-sm">{p.title}</span>
                  <span className="block text-xs text-[var(--ink-muted)]">
                    {p.district.replace(/_/g, " ")} · {p.state ?? "due"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel space-y-3">
        <h2 className="text-xl font-display">New conquests</h2>
        {newProblems.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">All plots claimed — focus on reviews.</p>
        ) : (
          <ul className="space-y-2">
            {newProblems.map((p) => (
              <li key={p.id}>
                <Link href={`/problem/${p.id}`} className="block rounded border border-[#b0893d]/50 px-3 py-2 hover:bg-[#fff8ee]">
                  <span className="font-display text-sm">{p.title}</span>
                  <span className="block text-xs text-[var(--ink-muted)]">
                    {p.district.replace(/_/g, " ")} · {p.difficulty}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
