"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebug } from "@/components/debug/DebugProvider";
import { DifficultyToggle } from "@/components/difficulty/DifficultyToggle";
import { StartJourneyButton } from "@/components/journey/StartJourneyButton";
import { TrackToggle } from "@/components/track/TrackToggle";
import { MuteToggle } from "@/components/ui/MuteToggle";
import catalog from "@/data/problems/catalog.json";

const CATALOG_TOTAL = catalog.length;
const CATALOG_BY_DIFF = catalog.reduce(
  (acc, p) => {
    const d = String(p.difficulty).toLowerCase();
    if (d === "easy" || d === "medium" || d === "hard") acc[d] += 1;
    return acc;
  },
  { easy: 0, medium: 0, hard: 0 },
);

type Props = {
  initialProgressiveUnlock: boolean;
  journeyStarted: boolean;
  filtersLocked: boolean;
  journeyComplete: boolean;
  isGuest: boolean;
  hasGeminiKey: boolean;
  pushEnabled: boolean;
};

export function SettingsPanel({
  initialProgressiveUnlock,
  journeyStarted,
  filtersLocked,
  journeyComplete,
  isGuest,
  hasGeminiKey: initialHasKey,
  pushEnabled: initialPush,
}: Props) {
  const router = useRouter();
  const {
    debugMode,
    setDebugMode,
    applyTest,
    clearTest,
    overrides,
    moraleOverride,
    setMoraleOverride,
  } = useDebug();
  const overrideCount = Object.keys(overrides).length;
  const moralePct =
    moraleOverride == null ? null : Math.round(moraleOverride * 100);

  const [confirmText, setConfirmText] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [progressive, setProgressive] = useState(initialProgressiveUnlock);
  const [progBusy, setProgBusy] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(initialHasKey);
  const [geminiInput, setGeminiInput] = useState("");
  const [geminiBusy, setGeminiBusy] = useState(false);
  const [geminiMsg, setGeminiMsg] = useState<string | null>(null);
  const [devicePushReady, setDevicePushReady] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [testPushBusy, setTestPushBusy] = useState(false);
  const [testPushMsg, setTestPushMsg] = useState<string | null>(null);

  useEffect(() => {
    setProgressive(initialProgressiveUnlock);
  }, [initialProgressiveUnlock]);

  useEffect(() => {
    let cancelled = false;
    async function checkDevicePush() {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
          if (!cancelled) setDevicePushReady(false);
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        const ready = Boolean(sub?.endpoint) && Notification.permission === "granted";
        if (!cancelled) setDevicePushReady(ready);
      } catch {
        if (!cancelled) setDevicePushReady(false);
      }
    }
    void checkDevicePush();
    return () => {
      cancelled = true;
    };
  }, [initialPush]);

  async function toggleProgressive(next: boolean) {
    setProgBusy(true);
    try {
      const res = await fetch("/api/user/journey-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressiveUnlock: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setProgressive(data.progressiveUnlock);
      router.refresh();
    } catch {
      setProgressive(!next);
    } finally {
      setProgBusy(false);
    }
  }

  async function resetKingdom() {
    setResetBusy(true);
    setResetMsg(null);
    setResetError(null);
    try {
      const res = await fetch("/api/user/reset-kingdom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Kingdom reset failed");
      }
      setConfirmText("");
      setResetMsg(
        `Kingdom reset. Cleared ${data.deletedAttempts ?? 0} attempts across ${data.problems ?? 0} quests. XP, streak, and journey start cleared.`,
      );
      router.refresh();
    } catch (e) {
      setResetError(e instanceof Error ? e.message : "Kingdom reset failed");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display">Settings</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Local preferences and progress controls. Debug overlays never write to the database.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
      <section className="panel space-y-3">
        <h2 className="font-display text-lg">Gemini API key</h2>
        {isGuest ? (
          <p className="text-sm text-[var(--ink-muted)]">
            <a href="/login" className="text-[var(--ember)] underline">
              Sign in
            </a>{" "}
            to store your own Gemini key for Coach, nudges, and use cases.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--ink-muted)]">
              Keys are encrypted at rest and never shown again.{" "}
              {hasGeminiKey ? "A key is on file." : "No key saved yet."}
            </p>
            <input
              type="password"
              value={geminiInput}
              onChange={(e) => setGeminiInput(e.target.value)}
              placeholder="Paste Gemini API key"
              className="w-full text-sm"
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary text-xs"
                disabled={geminiBusy || geminiInput.trim().length < 10}
                onClick={async () => {
                  setGeminiBusy(true);
                  setGeminiMsg(null);
                  try {
                    const res = await fetch("/api/user/gemini-key", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ apiKey: geminiInput.trim() }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error ?? "Save failed");
                    setHasGeminiKey(true);
                    setGeminiInput("");
                    setGeminiMsg("Key saved.");
                    router.refresh();
                  } catch (e) {
                    setGeminiMsg(e instanceof Error ? e.message : "Save failed");
                  } finally {
                    setGeminiBusy(false);
                  }
                }}
              >
                {geminiBusy ? "Saving…" : "Save key"}
              </button>
              {hasGeminiKey ? (
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  disabled={geminiBusy}
                  onClick={async () => {
                    setGeminiBusy(true);
                    try {
                      await fetch("/api/user/gemini-key", { method: "DELETE" });
                      setHasGeminiKey(false);
                      setGeminiMsg("Key cleared.");
                      router.refresh();
                    } finally {
                      setGeminiBusy(false);
                    }
                  }}
                >
                  Clear key
                </button>
              ) : null}
            </div>
            {geminiMsg ? <p className="text-xs text-[var(--ink-muted)]">{geminiMsg}</p> : null}
          </>
        )}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-display text-lg">Notifications</h2>
        {isGuest ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Sign in to subscribe to fire, rubble, and daily battle alerts on this device.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--ink-muted)]">
              Web push reminders for due reviews (fire), rubble, and daily invaders. Alerts fire once
              daily around 8:00 AM Eastern when you have something due.
            </p>
            {devicePushReady === false ? (
              <p className="text-xs text-[var(--ember)]">
                This browser is not subscribed yet
                {initialPush
                  ? " (another device may be). Enable notifications here to receive alerts on this machine."
                  : ". Enable notifications on this device."}
              </p>
            ) : null}
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={pushBusy}
              onClick={async () => {
                setPushBusy(true);
                setPushMsg(null);
                try {
                  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
                    throw new Error("Push not supported in this browser");
                  }
                  const perm = await Notification.requestPermission();
                  if (perm !== "granted") throw new Error("Notification permission denied");
                  const reg = await navigator.serviceWorker.register("/sw.js?v=icon2");
                  await navigator.serviceWorker.ready;
                  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                  if (!vapid) throw new Error("VAPID public key not configured");
                  const existing = await reg.pushManager.getSubscription();
                  if (existing) await existing.unsubscribe();
                  const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
                  });
                  const json = sub.toJSON();
                  const res = await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      endpoint: json.endpoint,
                      keys: json.keys,
                      replaceOthers: true,
                    }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error ?? "Subscribe failed");
                  setDevicePushReady(true);
                  setPushMsg("Subscribed on this device. Stale endpoints cleared.");
                } catch (e) {
                  setPushMsg(e instanceof Error ? e.message : "Subscribe failed");
                  setDevicePushReady(false);
                } finally {
                  setPushBusy(false);
                }
              }}
            >
              {pushBusy
                ? "Working…"
                : devicePushReady
                  ? "Re-subscribe this device"
                  : "Enable notifications"}
            </button>
            {pushMsg ? <p className="text-xs text-[var(--ink-muted)]">{pushMsg}</p> : null}
          </>
        )}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-display text-lg">Sound</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Mute map music that plays when you hover fire, battle, or rubble overlays. Preference is
          saved in this browser.
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-display">Map music</span>
          <MuteToggle />
        </div>
      </section>
        </div>

        <div className="space-y-5">
      <section className="panel space-y-3">
        <h2 className="font-display text-lg">Journey</h2>
        {!journeyStarted ? (
          <StartJourneyButton started={false} />
        ) : journeyComplete && progressive ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--ink-muted)]">
              You finished every quest matching this journey&apos;s filters across all districts.
              Start another journey to take on Medium, Hard, or a different roadmap — built buildings
              stay built.
            </p>
            <StartJourneyButton started restart />
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-muted)]">
            Your journey is underway. Daily invaders appear on The Realm and in the Daily Queue.
            Difficulty and roadmap stay locked until this filter set is complete
            {progressive ? "" : " (free roam lets you change them anytime from the header)"}.
            To switch pathways mid-journey, use Leave this pathway on The Realm (under the clock).
          </p>
        )}

        <div className="space-y-3 border-t border-[#b0893d]/35 pt-3">
          <p className="text-sm text-[var(--ink-muted)]">
            Filters lock mismatched buildings and shape the daily queue. Catalog:{" "}
            <span className="text-[var(--ink)]">{CATALOG_TOTAL}</span> problems (Easy{" "}
            {CATALOG_BY_DIFF.easy} · Medium {CATALOG_BY_DIFF.medium} · Hard {CATALOG_BY_DIFF.hard}).
          </p>
          {filtersLocked ? (
            <p className="text-xs text-[var(--ink-muted)]">
              Non-selected options are grayed out while progressive mode is on. Enable free roam
              below to choose freely, or finish this journey to start another.
            </p>
          ) : null}
          <div className="space-y-2">
            <p className="font-display text-xs uppercase tracking-wide text-[var(--ink-muted)]">
              Difficulty
            </p>
            <DifficultyToggle interactive={!filtersLocked} />
          </div>
          <div className="space-y-2">
            <p className="font-display text-xs uppercase tracking-wide text-[var(--ink-muted)]">
              Roadmap
            </p>
            <TrackToggle interactive={!filtersLocked} />
          </div>
        </div>

        <div className="space-y-3 border-t border-[#b0893d]/35 pt-3">
          <h3 className="font-display text-base">District unlock</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Progressive (recommended): districts open in order, and your journey difficulty/roadmap
            stay locked in the header. Free roam unlocks every district and lets you switch
            Easy/Medium/Hard and Beginner/Experienced from the top bar anytime.
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-display">
              {progressive ? "Progressive (filters locked)" : "Free roam (filters unlocked)"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={progressive}
              disabled={progBusy}
              className={`shrink-0 rounded border px-3 py-1.5 font-display text-xs uppercase tracking-wide transition ${
                progressive
                  ? "border-[var(--ember)] bg-[#fff0e4] text-[var(--ember)]"
                  : "border-[#8b6b3f] bg-[#fff8ee] text-[var(--ink-muted)]"
              }`}
              onClick={() => toggleProgressive(!progressive)}
            >
              {progressive ? "Progressive" : "Free roam"}
            </button>
          </div>
        </div>
      </section>

      <section className="panel space-y-3">
        <h2 className="font-display text-lg">Progress reset</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          To reset a single quest, open that problem and use{" "}
          <span className="text-[var(--ink)]">Reset this quest</span>. That clears its attempts and
          returns the building to unattempted (XP already earned stays).
        </p>
        <div className="space-y-2 border-t border-[#b0893d]/35 pt-3">
          <h3 className="font-display text-base text-[var(--ember)]">Reset entire kingdom</h3>
          <p className="text-sm text-[var(--ink-muted)]">
            Wipes all attempts, sets every building to unattempted, zeroes XP and streak, and clears
            the journey start so you can begin again. This cannot be undone.
          </p>
          <label className="block text-xs text-[var(--ink-muted)]">
            Type <span className="font-display text-[var(--ember)]">RESET</span> to confirm
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              className="mt-1 w-full rounded border border-[#8b6b3f] bg-[#fff8ee] px-3 py-2 font-display text-sm text-[var(--ink)]"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className="btn-primary bg-[#8b2e12] border-[#5c1c08]"
            disabled={resetBusy || confirmText.trim() !== "RESET"}
            onClick={resetKingdom}
          >
            {resetBusy ? "Resetting kingdom…" : "Reset entire kingdom"}
          </button>
          {resetMsg ? <p className="text-sm text-[var(--moss)]">{resetMsg}</p> : null}
          {resetError ? <p className="text-sm text-[var(--ember)]">{resetError}</p> : null}
        </div>
      </section>

      <section className="panel space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg">Debug Mode</h2>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              Temporary fire/rubble and court-morale previews. Browser only.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={debugMode}
            className={`shrink-0 rounded border px-3 py-1.5 font-display text-xs uppercase tracking-wide transition ${
              debugMode
                ? "border-[var(--ember)] bg-[#fff0e4] text-[var(--ember)]"
                : "border-[#8b6b3f] bg-[#fff8ee] text-[var(--ink-muted)]"
            }`}
            onClick={() => setDebugMode(!debugMode)}
          >
            {debugMode ? "On" : "Off"}
          </button>
        </div>

        {debugMode && (
          <div className="space-y-5 border-t border-[#b0893d]/40 pt-4">
            <div className="space-y-3">
              <p className="text-sm text-[var(--ink-muted)]">
                Apply a fixed Central Farmlands test: windmill + castle on fire, manor as rubble.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary text-sm" onClick={applyTest}>
                  Apply fire/rubble test
                </button>
                <button type="button" className="btn-ghost text-sm" onClick={clearTest}>
                  Clear test
                </button>
              </div>
              <p className="text-xs text-[var(--ink-muted)]">
                Active overrides: {overrideCount}
              </p>
            </div>

            <div className="space-y-3 border-t border-[#b0893d]/35 pt-4">
              <h3 className="font-display text-base">Court morale preview</h3>
              <p className="text-sm text-[var(--ink-muted)]">
                Force low morale to see sad/angry common folk and grim royals (fires &amp; invaders
                story). Return to the kingdom map to watch The Court react. Does not change real XP
                morale.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setMoraleOverride(1)}
                >
                  High 100%
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setMoraleOverride(0.45)}
                >
                  Uneasy 45%
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setMoraleOverride(0.12)}
                >
                  Crisis 12%
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setMoraleOverride(null)}
                >
                  Use real morale
                </button>
              </div>
              <label className="block text-xs text-[var(--ink-muted)]">
                Slider {moralePct == null ? "(real)" : `${moralePct}%`}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={moralePct ?? 100}
                  className="mt-1"
                  onChange={(e) => setMoraleOverride(Number(e.target.value) / 100)}
                />
              </label>
            </div>

            <div className="space-y-3 border-t border-[#b0893d]/35 pt-4">
              <h3 className="font-display text-base">Test push notification</h3>
              <p className="text-sm text-[var(--ink-muted)]">
                Sends the same reminder the daily cron would: fire, rubble, and today&apos;s battles
                based on your current progress. If the realm is calm, you&apos;ll get a calm message
                instead.
              </p>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={isGuest || testPushBusy}
                onClick={async () => {
                  setTestPushBusy(true);
                  setTestPushMsg(null);
                  try {
                    let localEndpoint: string | null = null;
                    let permission: NotificationPermission | "unsupported" = "unsupported";
                    if ("Notification" in window) permission = Notification.permission;
                    if ("serviceWorker" in navigator) {
                      const reg = await navigator.serviceWorker.getRegistration();
                      const sub = reg ? await reg.pushManager.getSubscription() : null;
                      localEndpoint = sub?.endpoint ?? null;
                    }
                    if (!localEndpoint || permission !== "granted") {
                      throw new Error(
                        "This browser has no active push subscription. Click Enable/Re-subscribe notifications first, then test again.",
                      );
                    }
                    const res = await fetch("/api/push/test", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientEndpoint: localEndpoint }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error ?? "Test push failed");
                    const counts = [
                      typeof data.fire === "number" ? `${data.fire} fire` : null,
                      typeof data.rubble === "number" ? `${data.rubble} rubble` : null,
                      typeof data.invaders === "number" ? `${data.invaders} battle` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    setTestPushMsg(
                      `Sent ${data.sent ?? 0} to this device: “${data.body ?? "ok"}”` +
                        (counts ? ` (${counts})` : "") +
                        (data.failed ? ` · ${data.failed} failed` : "") +
                        (data.endpointMatched === false
                          ? " · warning: browser endpoint was not in DB (re-subscribe)"
                          : ""),
                    );
                  } catch (e) {
                    setTestPushMsg(e instanceof Error ? e.message : "Test push failed");
                  } finally {
                    setTestPushBusy(false);
                  }
                }}
              >
                {testPushBusy ? "Sending…" : "Send test notification"}
              </button>
              {testPushMsg ? <p className="text-xs text-[var(--ink-muted)]">{testPushMsg}</p> : null}
            </div>
          </div>
        )}
      </section>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
