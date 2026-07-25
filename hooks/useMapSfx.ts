"use client";

import { useEffect } from "react";
import {
  damageKindFromBuilding,
  damageKindFromDistrict,
  setDamageHoverSfx,
  unlockAudio,
  type DamageSfxKind,
} from "@/lib/map-sfx";

/** Unlock AudioContext on first pointer/key interaction. */
export function useUnlockAudioOnGesture(): void {
  useEffect(() => {
    const unlock = () => {
      void unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
}

export function useDamageHoverSfx(kind: DamageSfxKind | null): void {
  useUnlockAudioOnGesture();
  useEffect(() => {
    setDamageHoverSfx(kind);
    return () => setDamageHoverSfx(null);
  }, [kind]);
}

export function useBuildingDamageHoverSfx(
  problem: { state: string; invaded?: boolean } | null,
): void {
  useDamageHoverSfx(damageKindFromBuilding(problem));
}

export function useDistrictDamageHoverSfx(
  stats: {
    locked?: boolean;
    hasSmoke?: boolean;
    hasRubble?: boolean;
    hasInvaders?: boolean;
  } | null,
): void {
  useDamageHoverSfx(damageKindFromDistrict(stats));
}
