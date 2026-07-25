"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyOverrideState,
  buildTestOverrides,
  districtHasFire,
  districtHasRubble,
  readDebugSnapshot,
  writeDebugMode,
  writeDebugMoraleOverride,
  writeDebugOverrides,
  type DebugOverrides,
} from "@/lib/debug-overlays";

type DebugContextValue = {
  ready: boolean;
  debugMode: boolean;
  overrides: DebugOverrides;
  /** null = follow real kingdom morale */
  moraleOverride: number | null;
  setDebugMode: (enabled: boolean) => void;
  setMoraleOverride: (value: number | null) => void;
  applyTest: () => void;
  clearTest: () => void;
  resolveState: (districtId: string, slot: string, baseState: string) => string;
  districtOnFire: (districtId: string, baseHasFire: boolean) => boolean;
  districtOnRubble: (districtId: string, baseHasRubble: boolean) => boolean;
  /** Effective morale for court UI */
  resolveMorale: (realMorale: number) => number;
};

const DebugContext = createContext<DebugContextValue | null>(null);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [debugMode, setDebugModeState] = useState(false);
  const [overrides, setOverrides] = useState<DebugOverrides>({});
  const [moraleOverride, setMoraleOverrideState] = useState<number | null>(null);

  useEffect(() => {
    const snap = readDebugSnapshot();
    setDebugModeState(snap.debugMode);
    setOverrides(snap.overrides);
    setMoraleOverrideState(snap.moraleOverride);
    setReady(true);
  }, []);

  const setDebugMode = useCallback((enabled: boolean) => {
    writeDebugMode(enabled);
    setDebugModeState(enabled);
    if (!enabled) {
      setOverrides({});
      setMoraleOverrideState(null);
    } else {
      const snap = readDebugSnapshot();
      setOverrides(snap.overrides);
      setMoraleOverrideState(snap.moraleOverride);
    }
  }, []);

  const setMoraleOverride = useCallback((value: number | null) => {
    writeDebugMoraleOverride(value);
    setMoraleOverrideState(value);
  }, []);

  const applyTest = useCallback(() => {
    const next = buildTestOverrides();
    writeDebugMode(true);
    writeDebugOverrides(next);
    setDebugModeState(true);
    setOverrides(next);
  }, []);

  const clearTest = useCallback(() => {
    writeDebugOverrides({});
    setOverrides({});
  }, []);

  const value = useMemo<DebugContextValue>(
    () => ({
      ready,
      debugMode,
      overrides,
      moraleOverride,
      setDebugMode,
      setMoraleOverride,
      applyTest,
      clearTest,
      resolveState: (districtId, slot, baseState) =>
        applyOverrideState(districtId, slot, baseState, debugMode, overrides),
      districtOnFire: (districtId, baseHasFire) =>
        districtHasFire(districtId, baseHasFire, debugMode, overrides),
      districtOnRubble: (districtId, baseHasRubble) =>
        districtHasRubble(districtId, baseHasRubble, debugMode, overrides),
      resolveMorale: (realMorale) =>
        debugMode && moraleOverride != null ? moraleOverride : realMorale,
    }),
    [
      ready,
      debugMode,
      overrides,
      moraleOverride,
      setDebugMode,
      setMoraleOverride,
      applyTest,
      clearTest,
    ],
  );

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>;
}

export function useDebug() {
  const ctx = useContext(DebugContext);
  if (!ctx) {
    throw new Error("useDebug must be used within DebugProvider");
  }
  return ctx;
}
