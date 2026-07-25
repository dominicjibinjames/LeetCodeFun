"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDebug } from "@/components/debug/DebugProvider";
import { DifficultyToggle } from "@/components/difficulty/DifficultyToggle";
import { TrackToggle } from "@/components/track/TrackToggle";
import { MuteToggle } from "@/components/ui/MuteToggle";
import { StatChips } from "@/components/ui/StatChips";

type Props = {
  xp: number;
  streakDays: number;
  morale: number;
  progressiveUnlock: boolean;
  filtersLocked: boolean;
  isGuest: boolean;
  hasGeminiKey: boolean;
  children: React.ReactNode;
};

export function AppShell({
  xp,
  streakDays,
  morale,
  progressiveUnlock,
  filtersLocked,
  isGuest,
  hasGeminiKey,
  children,
}: Props) {
  const router = useRouter();
  const { debugMode } = useDebug();
  const freeRoam = !progressiveUnlock;
  const filtersInteractive = freeRoam && !filtersLocked;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[#b0893d]/60 bg-[#f3e6c8]/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-display text-xl tracking-wide text-[var(--ink)]">
              Kingdom of Patterngard
            </Link>
            {debugMode && (
              <span className="rounded border border-[var(--ember)] bg-[#fff0e4] px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider text-[var(--ember)]">
                Debug
              </span>
            )}
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-display">
            <Link href="/queue" className="hover:text-[var(--ember)]">
              Daily Queue
            </Link>
            <Link href="/mastery" className="hover:text-[var(--ember)]">
              Mastery
            </Link>
            <Link href="/settings" className="hover:text-[var(--ember)]">
              Settings
            </Link>
            <DifficultyToggle interactive={filtersInteractive} />
            <TrackToggle interactive={filtersInteractive} />
            <StatChips xp={xp} streakDays={streakDays} moralePct={Math.round(morale * 100)} />
            <MuteToggle />
            {isGuest ? (
              <Link href="/login" className="btn-primary text-xs py-1">
                Sign in
              </Link>
            ) : (
              <button type="button" className="btn-ghost text-xs py-1" onClick={logout}>
                Leave
              </button>
            )}
          </nav>
        </div>
        {isGuest ? (
          <div className="border-t border-[#b0893d]/40 bg-[#fff8ee]/90 px-4 py-2 text-center text-xs text-[var(--ink-muted)]">
            Guest mode — progress is not saved.{" "}
            <Link href="/login" className="text-[var(--ember)] underline font-display">
              Sign in
            </Link>{" "}
            to keep your kingdom. Gemini Coach needs a key in Settings after sign-in.
          </div>
        ) : !hasGeminiKey ? (
          <div className="border-t border-[#b0893d]/40 bg-[#fff8ee]/90 px-4 py-2 text-center text-xs text-[var(--ink-muted)]">
            Add your Gemini API key in{" "}
            <Link href="/settings" className="text-[var(--ember)] underline font-display">
              Settings
            </Link>{" "}
            to unlock Coach, nudges, and generated use cases.
          </div>
        ) : null}
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      <footer className="text-center text-xs text-[var(--ink-muted)] py-4">
        Pattern before code. Buildings remember what you forget.
      </footer>
    </div>
  );
}
