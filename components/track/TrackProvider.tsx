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
  TRACK_COOKIE,
  TRACK_STORAGE_KEY,
  parseTrackMode,
  type TrackMode,
} from "@/lib/track-mode";

type TrackContextValue = {
  ready: boolean;
  mode: TrackMode;
  setMode: (mode: TrackMode) => void;
};

const TrackContext = createContext<TrackContextValue | null>(null);

function writeCookie(mode: TrackMode) {
  document.cookie = `${TRACK_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

export function TrackProvider({
  initialMode,
  locked = false,
  children,
}: {
  initialMode?: TrackMode;
  locked?: boolean;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<TrackMode>(initialMode ?? "all");

  useEffect(() => {
    if (locked && initialMode) {
      setModeState(initialMode);
      window.localStorage.setItem(TRACK_STORAGE_KEY, initialMode);
      writeCookie(initialMode);
      setReady(true);
      return;
    }
    const fromStorage = parseTrackMode(window.localStorage.getItem(TRACK_STORAGE_KEY));
    setModeState(initialMode ?? fromStorage);
    writeCookie(initialMode ?? fromStorage);
    setReady(true);
  }, [locked, initialMode]);

  const setMode = useCallback((next: TrackMode) => {
    setModeState(next);
    window.localStorage.setItem(TRACK_STORAGE_KEY, next);
    writeCookie(next);
  }, []);

  const value = useMemo(() => ({ ready, mode, setMode }), [ready, mode, setMode]);

  return <TrackContext.Provider value={value}>{children}</TrackContext.Provider>;
}

export function useTrack() {
  const ctx = useContext(TrackContext);
  if (!ctx) {
    throw new Error("useTrack must be used within TrackProvider");
  }
  return ctx;
}
