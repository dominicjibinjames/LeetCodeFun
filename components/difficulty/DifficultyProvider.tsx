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
  DIFFICULTY_COOKIE,
  DIFFICULTY_STORAGE_KEY,
  parseDifficultyMode,
  type DifficultyMode,
} from "@/lib/difficulty-mode";

type DifficultyContextValue = {
  ready: boolean;
  mode: DifficultyMode;
  setMode: (mode: DifficultyMode) => void;
};

const DifficultyContext = createContext<DifficultyContextValue | null>(null);

function writeCookie(mode: DifficultyMode) {
  document.cookie = `${DIFFICULTY_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

export function DifficultyProvider({
  initialMode,
  locked = false,
  children,
}: {
  initialMode?: DifficultyMode;
  /** When true, keep server journey mode and ignore localStorage overrides. */
  locked?: boolean;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<DifficultyMode>(initialMode ?? "all");

  useEffect(() => {
    if (locked && initialMode) {
      setModeState(initialMode);
      window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, initialMode);
      writeCookie(initialMode);
      setReady(true);
      return;
    }
    const fromStorage = parseDifficultyMode(
      window.localStorage.getItem(DIFFICULTY_STORAGE_KEY),
    );
    setModeState(initialMode ?? fromStorage);
    writeCookie(initialMode ?? fromStorage);
    setReady(true);
  }, [locked, initialMode]);

  const setMode = useCallback((next: DifficultyMode) => {
    setModeState(next);
    window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, next);
    writeCookie(next);
  }, []);

  const value = useMemo(
    () => ({ ready, mode, setMode }),
    [ready, mode, setMode],
  );

  return (
    <DifficultyContext.Provider value={value}>{children}</DifficultyContext.Provider>
  );
}

export function useDifficulty() {
  const ctx = useContext(DifficultyContext);
  if (!ctx) {
    throw new Error("useDifficulty must be used within DifficultyProvider");
  }
  return ctx;
}
