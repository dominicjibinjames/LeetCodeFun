"use client";

import type { PatternFeedback } from "@/lib/gemini";
import { GeminiText } from "@/components/ui/GeminiText";

type Props = {
  feedback: PatternFeedback | null;
  loading?: boolean;
  error?: string | null;
};

export function FeedbackPanel({ feedback, loading, error }: Props) {
  if (loading) {
    return (
      <div className="rounded border border-[#b0893d]/40 bg-[#fff8ee]/70 p-3 text-sm text-[var(--ink-muted)]">
        Gathering feedback…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded border border-[var(--ember)]/40 bg-[#fff0e4]/80 p-3 text-sm text-[var(--ember)]">
        {error}
      </div>
    );
  }
  if (!feedback) return null;

  return (
    <div className="space-y-3 rounded border border-[#b0893d]/50 bg-[#fff8ee]/80 p-3">
      <h3 className="font-display text-sm tracking-wide">Competency feedback</h3>
      {feedback.wentWrong.length > 0 ? (
        <div>
          <p className="font-display text-[10px] uppercase tracking-wide text-[var(--ember)] mb-1">
            Where you went wrong
          </p>
          <ul className="list-disc pl-4 space-y-1 text-sm">
            {feedback.wentWrong.map((line, i) => (
              <li key={`w-${i}`}>
                <GeminiText>{line}</GeminiText>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">No major issues flagged yet.</p>
      )}
      {feedback.improve.length > 0 ? (
        <div>
          <p className="font-display text-[10px] uppercase tracking-wide text-[var(--ink-muted)] mb-1">
            What to improve
          </p>
          <ul className="list-disc pl-4 space-y-1 text-sm">
            {feedback.improve.map((line, i) => (
              <li key={`i-${i}`}>
                <GeminiText>{line}</GeminiText>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="text-sm border-t border-[#b0893d]/35 pt-2 leading-relaxed">
        <span className="font-display text-[10px] uppercase tracking-wide text-[var(--ink-muted)] block mb-1">
          Pattern focus
        </span>
        <GeminiText>{feedback.patternFocus}</GeminiText>
      </div>
    </div>
  );
}
