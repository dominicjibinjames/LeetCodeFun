export type OverlayState = "fire" | "rubble";

export type DebugOverrides = Record<string, OverlayState>;

export const DEBUG_STORAGE_KEY = "patterngard-debug";
export const DEBUG_OVERRIDES_KEY = "patterngard-debug-overrides";
export const DEBUG_MORALE_KEY = "patterngard-debug-morale";

/** Fixed Central Farmlands slots used by Apply fire/rubble test (by buildingSlot). */
export const DEBUG_TEST_SLOTS: { districtId: string; slot: string; state: OverlayState }[] = [
  { districtId: "central_farmlands", slot: "farm_1", state: "fire" },
  { districtId: "central_farmlands", slot: "farm_3", state: "fire" },
  { districtId: "central_farmlands", slot: "farm_2", state: "rubble" },
];

export type DebugSnapshot = {
  debugMode: boolean;
  /** Keys are `districtId:slot` */
  overrides: DebugOverrides;
  /** null = use real morale; 0..1 when debug previewing court mood */
  moraleOverride: number | null;
};

export function overrideKey(districtId: string, slot: string): string {
  return `${districtId}:${slot}`;
}

export function parseOverrideKey(key: string): { districtId: string; slot: string } | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  return { districtId: key.slice(0, i), slot: key.slice(i + 1) };
}

export function readDebugSnapshot(): DebugSnapshot {
  if (typeof window === "undefined") {
    return { debugMode: false, overrides: {}, moraleOverride: null };
  }
  try {
    const debugMode = window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
    const raw = window.localStorage.getItem(DEBUG_OVERRIDES_KEY);
    const overrides: DebugOverrides = raw ? (JSON.parse(raw) as DebugOverrides) : {};
    const moraleRaw = window.localStorage.getItem(DEBUG_MORALE_KEY);
    const moraleOverride =
      debugMode && moraleRaw != null && moraleRaw !== ""
        ? Math.min(1, Math.max(0, Number(moraleRaw)))
        : null;
    return {
      debugMode,
      overrides: debugMode ? overrides : {},
      moraleOverride: Number.isFinite(moraleOverride as number) ? moraleOverride : null,
    };
  } catch {
    return { debugMode: false, overrides: {}, moraleOverride: null };
  }
}

export function writeDebugMode(enabled: boolean) {
  window.localStorage.setItem(DEBUG_STORAGE_KEY, enabled ? "1" : "0");
  if (!enabled) {
    window.localStorage.removeItem(DEBUG_OVERRIDES_KEY);
    window.localStorage.removeItem(DEBUG_MORALE_KEY);
  }
}

export function writeDebugOverrides(overrides: DebugOverrides) {
  window.localStorage.setItem(DEBUG_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function writeDebugMoraleOverride(value: number | null) {
  if (value == null) {
    window.localStorage.removeItem(DEBUG_MORALE_KEY);
    return;
  }
  window.localStorage.setItem(DEBUG_MORALE_KEY, String(Math.min(1, Math.max(0, value))));
}

export function buildTestOverrides(): DebugOverrides {
  const overrides: DebugOverrides = {};
  for (const t of DEBUG_TEST_SLOTS) {
    overrides[overrideKey(t.districtId, t.slot)] = t.state;
  }
  return overrides;
}

export function applyOverrideState(
  districtId: string,
  slot: string,
  baseState: string,
  debugMode: boolean,
  overrides: DebugOverrides,
): string {
  if (!debugMode) return baseState;
  const o = overrides[overrideKey(districtId, slot)];
  return o ?? baseState;
}

export function districtHasFire(
  districtId: string,
  baseHasFire: boolean,
  debugMode: boolean,
  overrides: DebugOverrides,
): boolean {
  if (baseHasFire) return true;
  if (!debugMode) return false;
  return Object.entries(overrides).some(
    ([key, state]) => state === "fire" && key.startsWith(`${districtId}:`),
  );
}

export function districtHasRubble(
  districtId: string,
  baseHasRubble: boolean,
  debugMode: boolean,
  overrides: DebugOverrides,
): boolean {
  if (baseHasRubble) return true;
  if (!debugMode) return false;
  return Object.entries(overrides).some(
    ([key, state]) => state === "rubble" && key.startsWith(`${districtId}:`),
  );
}
