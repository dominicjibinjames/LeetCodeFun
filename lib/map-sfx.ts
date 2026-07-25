/**
 * Map damage SFX — plays provided MP3 beds while hovering fire / battle / rubble.
 * Call unlockAudio() once from a user gesture so browsers allow playback.
 *
 * Assets:
 *   fire   → Timbers_Fray.mp3
 *   battle → The_Final_Watch.mp3
 *   rubble → The_Last_Stone_Standing.mp3
 */

export type DamageSfxKind = "fire" | "battle" | "rubble";

const SFX_SRC: Record<DamageSfxKind, string> = {
  fire: "/sfx/fire.mp3?v=timbers1",
  battle: "/sfx/battle.mp3?v=watch1",
  rubble: "/sfx/rubble.mp3?v=stone1",
};

export const MUTE_STORAGE_KEY = "patterngard-sfx-muted";

const players: Partial<Record<DamageSfxKind, HTMLAudioElement>> = {};
let lastKind: DamageSfxKind | null = null;
/** Kind the UI currently wants — used to resume after unmute. */
let desiredKind: DamageSfxKind | null = null;
let unlocked = false;
let muted = false;
/** Monotonic token so a stale pause/null cannot kill a newer hover play. */
let playEpoch = 0;

function readMutedFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMutedToStorage(next: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isSfxMuted(): boolean {
  if (typeof window !== "undefined" && !mutedInitialized) {
    muted = readMutedFromStorage();
    mutedInitialized = true;
  }
  return muted;
}

let mutedInitialized = false;

function ensureMuteHydrated() {
  if (typeof window === "undefined" || mutedInitialized) return;
  muted = readMutedFromStorage();
  mutedInitialized = true;
}

function getPlayer(kind: DamageSfxKind): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let audio = players[kind];
  if (!audio) {
    audio = new Audio(SFX_SRC[kind]);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0.55;
    players[kind] = audio;
  }
  return audio;
}

/** One-shot unlock after a real user gesture. Safe to call often. */
export async function unlockAudio(): Promise<void> {
  if (typeof window === "undefined") return;
  if (unlocked) return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      await ctx.resume();
      await ctx.close();
    }
    unlocked = true;
    getPlayer("fire");
    getPlayer("battle");
    getPlayer("rubble");
  } catch {
    /* ignore — hover play may still work after a later gesture */
  }
}

function stopKind(kind: DamageSfxKind) {
  const audio = players[kind];
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
}

function stopAllExcept(keep: DamageSfxKind | null) {
  for (const kind of Object.keys(players) as DamageSfxKind[]) {
    if (kind === keep) continue;
    stopKind(kind);
  }
}

function playKind(kind: DamageSfxKind, epoch: number) {
  const audio = getPlayer(kind);
  if (!audio) return;
  audio.loop = true;
  audio.volume = 0.55;
  if (audio.paused || audio.currentTime === 0) {
    void audio
      .play()
      .then(() => {
        if (epoch !== playEpoch || muted) {
          audio.pause();
        }
      })
      .catch(() => {
        /* autoplay may still be blocked until a gesture */
      });
  }
}

/** Mute / unmute map SFX. Persists in localStorage. */
export function setSfxMuted(next: boolean): void {
  ensureMuteHydrated();
  muted = next;
  mutedInitialized = true;
  writeMutedToStorage(next);
  if (muted) {
    playEpoch += 1;
    stopAllExcept(null);
    return;
  }
  // Resume currently hovered damage kind, if any
  if (desiredKind) {
    lastKind = null;
    setDamageHoverSfx(desiredKind);
  }
}

/** Start / switch damage SFX for the hovered overlay kind. Pass null to stop. */
export function setDamageHoverSfx(kind: DamageSfxKind | null): void {
  if (typeof window === "undefined") return;
  ensureMuteHydrated();

  const epoch = ++playEpoch;
  desiredKind = kind;

  if (kind === lastKind) return;

  if (!kind) {
    // Defer stop so React Strict Mode cleanup → remount does not kill the remount play.
    Promise.resolve().then(() => {
      if (epoch !== playEpoch) return;
      stopAllExcept(null);
      lastKind = null;
    });
    return;
  }

  lastKind = kind;
  stopAllExcept(kind);

  if (muted) return;
  playKind(kind, epoch);
}

export function damageKindFromBuilding(problem: {
  state: string;
  invaded?: boolean;
} | null): DamageSfxKind | null {
  if (!problem) return null;
  if (problem.state === "rubble") return "rubble";
  if (problem.state === "fire") return "fire";
  if (problem.invaded && problem.state === "unattempted") return "battle";
  return null;
}

export function damageKindFromDistrict(stats: {
  locked?: boolean;
  hasSmoke?: boolean;
  hasRubble?: boolean;
  hasInvaders?: boolean;
} | null): DamageSfxKind | null {
  if (!stats || stats.locked) return null;
  if (stats.hasRubble) return "rubble";
  if (stats.hasSmoke) return "fire";
  if (stats.hasInvaders) return "battle";
  return null;
}
