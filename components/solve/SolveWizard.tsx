"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackPanel } from "./FeedbackPanel";
import { GeminiText } from "@/components/ui/GeminiText";
import { PatternSelect } from "./PatternSelect";
import { TimerBar } from "./TimerBar";
import { CodeStep } from "./CodeStep";
import { readRoughWorkNotes } from "@/components/solve/RoughWorkPad";
import type { PatternFeedback } from "@/lib/gemini";

type Problem = {
  id: string;
  title: string;
  statement: string;
  leetcodeUrl: string;
  patternPrimary: string;
  difficulty: string;
  state: string;
};

type Props = {
  problem: Problem;
  isGuest?: boolean;
};

type Step = "useCases" | "pattern" | "explain" | "complexity" | "code" | "done";

function feedbackStorageKey(problemId: string) {
  return `patterngard-feedback:${problemId}`;
}

const GUEST_USE_CASES = [
  "In a backend service, engineers scan records in one efficient pass instead of nested loops.",
  "In an API or admin dashboard, the same idea helps process user or event data with less CPU.",
  "In data cleanup or search features, teams use a careful scan to turn a brute-force check into a faster pass.",
];

export function SolveWizard({ problem, isGuest = false }: Props) {
  const router = useRouter();
  const isBoss =
    problem.state === "unattempted" || problem.state === "rubble";
  const isReview = problem.state === "fire";

  const defaultReasoning = Number(process.env.NEXT_PUBLIC_BOSS_REASONING_SECONDS ?? 900);
  const defaultCoding = Number(process.env.NEXT_PUBLIC_BOSS_CODING_SECONDS ?? 1200);

  const [step, setStep] = useState<Step>("useCases");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [loadingUseCases, setLoadingUseCases] = useState(true);
  const [useCaseHint, setUseCaseHint] = useState("");
  const [regenBusy, setRegenBusy] = useState(false);
  const [sessionUseCases, setSessionUseCases] = useState(false);
  const [patternGuess, setPatternGuess] = useState("");
  const [justification, setJustification] = useState("");
  const [nudge, setNudge] = useState("");
  const [explanation, setExplanation] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [timeComplexity, setTimeComplexity] = useState("");
  const [spaceComplexity, setSpaceComplexity] = useState("");
  const [complexityWhy, setComplexityWhy] = useState("");
  const [code, setCode] = useState("");
  const [passed, setPassed] = useState<boolean | null>(null);
  const [resultMsg, setResultMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<PatternFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const finalFeedbackRequested = useRef(false);

  const [reasoningMinutes, setReasoningMinutes] = useState(Math.round(defaultReasoning / 60));
  const [codingMinutes, setCodingMinutes] = useState(Math.round(defaultCoding / 60));
  const [timerArmed, setTimerArmed] = useState(false);
  const [reasoningBudget, setReasoningBudget] = useState(defaultReasoning);
  const [codingBudget, setCodingBudget] = useState(defaultCoding);
  const [reasoningLeft, setReasoningLeft] = useState(defaultReasoning);
  const [codingLeft, setCodingLeft] = useState(defaultCoding);
  const [phase, setPhase] = useState<"reasoning" | "coding">("reasoning");
  const [timerPaused, setTimerPaused] = useState(false);
  const [nudgeBusy, setNudgeBusy] = useState(false);
  const reasoningElapsed = useRef(0);
  const codingElapsed = useRef(0);
  const bossFailed = useRef(false);

  function armTimer() {
    const rSec = Math.max(1, Math.round(reasoningMinutes * 60));
    const cSec = Math.max(1, Math.round(codingMinutes * 60));
    setReasoningBudget(rSec);
    setCodingBudget(cSec);
    setReasoningLeft(rSec);
    setCodingLeft(cSec);
    reasoningElapsed.current = 0;
    codingElapsed.current = 0;
    bossFailed.current = false;
    setTimerPaused(false);
    setTimerArmed(true);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingUseCases(true);
      if (isGuest) {
        if (!cancelled) {
          setUseCases(GUEST_USE_CASES);
          setLoadingUseCases(false);
        }
        return;
      }
      try {
        const res = await fetch(`/api/problems/${problem.id}/use-cases`);
        const rawText = await res.text();
        const data = rawText ? JSON.parse(rawText) : {};
        if (!cancelled) {
          setUseCases(data.useCases ?? []);
          setSessionUseCases(false);
        }
      } catch {
        if (!cancelled) setUseCases([]);
      } finally {
        if (!cancelled) setLoadingUseCases(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [problem.id, isGuest]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(feedbackStorageKey(problem.id));
      if (raw) setFeedback(JSON.parse(raw) as PatternFeedback);
    } catch {
      /* ignore */
    }
  }, [problem.id]);

  useEffect(() => {
    if (step === "done" || !timerArmed || timerPaused) return;
    const id = setInterval(() => {
      if (phase === "reasoning" && step !== "code") {
        reasoningElapsed.current += 1;
        setReasoningLeft((s) => {
          if (s <= 1) {
            bossFailed.current = true;
            return 0;
          }
          return s - 1;
        });
      } else if (phase === "coding" || step === "code") {
        codingElapsed.current += 1;
        setCodingLeft((s) => {
          if (s <= 1) {
            bossFailed.current = true;
            return 0;
          }
          return s - 1;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, step, timerArmed, timerPaused]);

  const mode = useMemo(() => {
    if (isReview) return "review" as const;
    if (isBoss) return "timed" as const;
    return "practice" as const;
  }, [isBoss, isReview]);

  const requestFeedback = useCallback(
    async (stage: "mid" | "final") => {
      setFeedbackLoading(true);
      setFeedbackError(null);
      try {
        const res = await fetch(`/api/problems/${problem.id}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage,
            patternGuess,
            patternJustification: justification,
            explanation,
            timeComplexity,
            spaceComplexity,
            complexityWhy,
            confidenceRating: confidence,
            passedLeetCode: passed,
            code,
            clientScratch: readRoughWorkNotes(problem.id).slice(0, 800),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Feedback failed");
        const next = data.feedback as PatternFeedback;
        setFeedback(next);
        try {
          sessionStorage.setItem(feedbackStorageKey(problem.id), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      } catch (e) {
        setFeedbackError(e instanceof Error ? e.message : "Feedback failed");
      } finally {
        setFeedbackLoading(false);
      }
    },
    [
      problem.id,
      patternGuess,
      justification,
      explanation,
      timeComplexity,
      spaceComplexity,
      complexityWhy,
      confidence,
      passed,
      code,
    ],
  );

  async function regenerateUseCases() {
    setRegenBusy(true);
    try {
      const res = await fetch(`/api/problems/${problem.id}/use-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint: useCaseHint.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Regenerate failed");
      setUseCases(data.useCases ?? []);
      setSessionUseCases(true);
    } catch {
      /* keep current list */
    } finally {
      setRegenBusy(false);
    }
  }

  const requestNudge = useCallback(async () => {
    if (
      step !== "pattern" &&
      step !== "explain" &&
      step !== "complexity" &&
      step !== "code"
    ) {
      return;
    }
    setNudgeBusy(true);
    try {
      const res = await fetch(`/api/problems/${problem.id}/nudge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: step,
          patternGuess,
          justification,
          explanation,
          timeComplexity,
          spaceComplexity,
          complexityWhy,
          code,
          clientScratch: readRoughWorkNotes(problem.id).slice(0, 400),
        }),
      });
      const data = await res.json().catch(() => ({}));
      setNudge(data.nudge ?? "");
    } finally {
      setNudgeBusy(false);
    }
  }, [
    problem.id,
    step,
    patternGuess,
    justification,
    explanation,
    timeComplexity,
    spaceComplexity,
    complexityWhy,
    code,
  ]);

  async function submit(opts?: { bossWon?: boolean }) {
    if (isGuest) {
      setResultMsg("Sign in to log attempts and save your kingdom progress.");
      setStep("done");
      return;
    }
    setSubmitting(true);
    setResultMsg("");
    try {
      const bossFightWon =
        isBoss && !bossFailed.current && opts?.bossWon !== false && reasoningLeft > 0 && codingLeft >= 0;

      const res = await fetch(`/api/problems/${problem.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patternGuess,
          patternJustification: justification,
          explanation,
          timeComplexity,
          spaceComplexity,
          complexityWhy,
          confidenceRating: confidence,
          reasoningSeconds: reasoningElapsed.current,
          codingSeconds: codingElapsed.current,
          wasBossFight: isBoss,
          bossFightWon: isBoss ? Boolean(bossFightWon) : undefined,
          passedLeetCode: passed,
          mode,
          reviewClean: isReview ? Boolean(passed !== false && explanation.trim()) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");

      const state = data.reviewState?.state as string | undefined;
      const builtNow = state === "built";
      const parts: string[] = [];
      if (data.wasCorrectPattern) {
        parts.push("Pattern matched.");
      } else {
        parts.push(
          "Pattern differed from this landmark’s catalog pattern — the building was not raised.",
        );
      }
      if (isBoss && !bossFightWon) {
        parts.push("Boss fight lost (timer ran out) — invaders remain.");
      }
      parts.push(`XP ${data.xpDelta >= 0 ? "+" : ""}${data.xpDelta}.`);
      if (data.courtBonus) parts.push(`Court overtime +${data.courtBonus}.`);
      if (builtNow) {
        parts.push("Building raised — map invaders for this quest will clear.");
      } else if (isBoss || isReview) {
        parts.push(
          "Invaders/fire stay until a clean solve (correct pattern + LeetCode pass" +
            (isBoss ? " + boss win" : "") +
            "). Retry this quest.",
        );
      } else if (state) {
        parts.push(`Building state: ${state}.`);
      }
      setResultMsg(parts.filter(Boolean).join(" "));
      setStep("done");
      router.refresh();
    } catch (e) {
      setResultMsg(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (step !== "done" || finalFeedbackRequested.current) return;
    finalFeedbackRequested.current = true;
    void requestFeedback("final");
  }, [step, requestFeedback]);

  const stageNudgeControls =
    step === "pattern" ||
    step === "explain" ||
    step === "complexity" ||
    step === "code" ? (
      <div className="space-y-2">
        {nudge ? (
          <div className="text-sm italic border-l-2 border-[var(--gold)] pl-3 text-[var(--ink-muted)]">
            <GeminiText>{nudge}</GeminiText>
          </div>
        ) : null}
        <button
          type="button"
          className="btn-ghost text-xs"
          disabled={nudgeBusy}
          onClick={() => void requestNudge()}
        >
          {nudgeBusy ? "Nudging…" : "Ask for a nudge"}
        </button>
      </div>
    ) : null;

  return (
    <div className="panel space-y-5">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-[var(--ink-muted)] font-display">
          {isBoss ? "Boss fight" : isReview ? "Review (building on fire)" : "Practice"} · {problem.difficulty}
        </p>
        <h1 className="text-2xl md:text-3xl">{problem.title}</h1>
        <p className="text-[var(--ink-muted)] text-sm leading-relaxed">{problem.statement}</p>
        <a
          href={problem.leetcodeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-display text-[var(--ember)] hover:underline"
        >
          Open on LeetCode ↗
        </a>
      </header>

      {!timerArmed && (
        <section className="space-y-3 rounded border border-[#b0893d]/50 bg-[#fff8ee]/60 p-4">
          <h2 className="text-lg font-display">Set your timers</h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Choose how long you want for reasoning (pattern + explain) and coding. The HP bar starts
            only after you confirm — same for boss fights, reviews, and practice.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-display text-[var(--ink-muted)]">Reasoning (minutes)</span>
              <input
                type="number"
                min={1}
                max={180}
                value={reasoningMinutes}
                onChange={(e) => setReasoningMinutes(Number(e.target.value) || 1)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-display text-[var(--ink-muted)]">Coding (minutes)</span>
              <input
                type="number"
                min={1}
                max={180}
                value={codingMinutes}
                onChange={(e) => setCodingMinutes(Number(e.target.value) || 1)}
              />
            </label>
          </div>
          <button type="button" className="btn-primary" onClick={armTimer}>
            Start timer
          </button>
        </section>
      )}

      {timerArmed && step !== "done" && (
        <TimerBar
          label={step === "code" ? "Coding phase HP" : "Reasoning phase HP"}
          remainingSeconds={step === "code" ? codingLeft : reasoningLeft}
          totalSeconds={step === "code" ? codingBudget : reasoningBudget}
          paused={timerPaused}
          onTogglePause={() => setTimerPaused((p) => !p)}
        />
      )}

      {step === "useCases" && (
        <section className="space-y-3">
          <h2 className="text-lg">Business use cases</h2>
          {loadingUseCases ? (
            <p className="text-sm text-[var(--ink-muted)]">Gathering scenarios…</p>
          ) : useCases.length === 0 ? (
            <p className="text-sm text-[var(--ember)]">Could not load use cases. You can still continue.</p>
          ) : (
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              {useCases.map((u, i) => (
                <li key={i}>
                  <GeminiText>{u}</GeminiText>
                </li>
              ))}
            </ol>
          )}
          {sessionUseCases ? (
            <p className="text-[10px] text-[var(--ink-muted)]">
              Showing a regenerated set for this visit only (cached catalog unchanged).
            </p>
          ) : null}
          <div className="space-y-2 rounded border border-[#b0893d]/35 bg-[#fff8ee]/50 p-3">
            <label className="block text-xs text-[var(--ink-muted)]">
              Optional direction for more use cases
              <input
                type="text"
                value={useCaseHint}
                onChange={(e) => setUseCaseHint(e.target.value)}
                placeholder="e.g. easier to understand, more software engineering…"
                className="mt-1 w-full text-sm"
                disabled={regenBusy || loadingUseCases}
              />
            </label>
            <button
              type="button"
              className="btn-ghost text-xs"
              disabled={regenBusy || loadingUseCases}
              onClick={() => void regenerateUseCases()}
            >
              {regenBusy ? "Generating…" : "More use cases"}
            </button>
          </div>
          <button
            className="btn-primary"
            disabled={loadingUseCases || !timerArmed}
            onClick={() => setStep("pattern")}
          >
            Continue to pattern ID
          </button>
          {!timerArmed && (
            <p className="text-xs text-[var(--ink-muted)]">Set and start your timer above first.</p>
          )}
        </section>
      )}

      {step === "pattern" && (
        <section className="space-y-3">
          <h2 className="text-lg">Pattern ID & justification</h2>
          <PatternSelect value={patternGuess} onChange={setPatternGuess} />
          <div>
            <label className="block text-sm font-display text-[var(--ink-muted)] mb-1">
              Why this pattern? (1–2 sentences)
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="What property of the problem signals this pattern?"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-primary"
              disabled={!patternGuess.trim() || justification.trim().length < 8}
              onClick={() => {
                setNudge("");
                setStep("explain");
              }}
            >
              Continue
            </button>
          </div>
          {stageNudgeControls}
        </section>
      )}

      {step === "explain" && (
        <section className="space-y-3">
          <h2 className="text-lg">Explain first</h2>
          <p className="text-sm text-[var(--ink-muted)]">
            Walk through the approach in plain English or pseudocode. Complexity comes next; code
            unlocks after that.
          </p>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Step by step…"
            className="min-h-[180px]"
          />
          <div>
            <label className="block text-sm font-display text-[var(--ink-muted)] mb-1">
              Confidence (1–5): {confidence}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
            />
          </div>
          <button
            className="btn-primary"
            disabled={explanation.trim().length < 20}
            onClick={() => {
              setNudge("");
              setStep("complexity");
            }}
          >
            Continue to complexity
          </button>
          {stageNudgeControls}
        </section>
      )}

      {step === "complexity" && (
        <section className="space-y-3">
          <h2 className="text-lg">Time &amp; space complexity</h2>
          <p className="text-sm text-[var(--ink-muted)]">
            State Big-O for your approach before coding. Be honest about extra arrays, recursion
            stacks, and hash maps.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-display text-[var(--ink-muted)]">Time</span>
              <input
                type="text"
                value={timeComplexity}
                onChange={(e) => setTimeComplexity(e.target.value)}
                placeholder="e.g. O(n)"
                className="mt-1 w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="font-display text-[var(--ink-muted)]">Space</span>
              <input
                type="text"
                value={spaceComplexity}
                onChange={(e) => setSpaceComplexity(e.target.value)}
                placeholder="e.g. O(1)"
                className="mt-1 w-full"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-display text-[var(--ink-muted)]">Why? (optional)</span>
            <textarea
              value={complexityWhy}
              onChange={(e) => setComplexityWhy(e.target.value)}
              placeholder="What dominates — loops, recursion depth, extra structures…"
              className="mt-1 min-h-[80px]"
            />
          </label>
          <button
            className="btn-primary"
            disabled={timeComplexity.trim().length < 2 || spaceComplexity.trim().length < 2}
            onClick={() => {
              setPhase("coding");
              setNudge("");
              setStep("code");
            }}
          >
            Unlock code step
          </button>
          {stageNudgeControls}
        </section>
      )}

      {step === "code" && (
        <section className="space-y-3">
          <h2 className="text-lg">Code & LeetCode</h2>
          <CodeStep value={code} onChange={setCode} />
          <a
            href={problem.leetcodeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block btn-ghost"
          >
            Open on LeetCode ↗
          </a>
          <div className="space-y-2">
            <p className="text-sm font-display text-[var(--ink-muted)]">Did you pass on LeetCode?</p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn-ghost ${passed === true ? "ring-2 ring-[var(--moss)]" : ""}`}
                onClick={() => setPassed(true)}
              >
                Passed
              </button>
              <button
                type="button"
                className={`btn-ghost ${passed === false ? "ring-2 ring-[var(--ember)]" : ""}`}
                onClick={() => setPassed(false)}
              >
                Failed / skipped
              </button>
            </div>
          </div>
          {stageNudgeControls}
          <button
            className="btn-primary"
            disabled={submitting || passed === null || (isBoss && bossFailed.current)}
            onClick={() => submit()}
          >
            {submitting ? "Saving…" : isGuest ? "Finish (sign in to save)" : isBoss ? "Finish boss fight" : "Log attempt"}
          </button>
          {bossFailed.current && (
            <p className="text-sm text-[var(--ember)]">
              {isBoss
                ? "Timer ran out — the building was not constructed. You can retry anytime."
                : "Timer ran out — you can still log the attempt."}
            </p>
          )}
        </section>
      )}

      {step === "done" && (
        <section className="space-y-3">
          <h2 className="text-lg">Logged</h2>
          <p className="text-sm">{resultMsg}</p>
          {isGuest ? (
            <a href="/login" className="btn-primary inline-block">
              Sign in to save progress
            </a>
          ) : null}
          <FeedbackPanel feedback={feedback} loading={feedbackLoading} error={feedbackError} />
          <div className="flex gap-2">
            <a href="/" className="btn-primary">
              Return to kingdom
            </a>
            <a href="/queue" className="btn-ghost">
              Daily queue
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
