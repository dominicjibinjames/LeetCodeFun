"use client";

import { useRef, useState } from "react";
import { readRoughWorkNotes } from "@/components/solve/RoughWorkPad";
import { GeminiText } from "@/components/ui/GeminiText";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  problemId: string;
};

export function CoachChat({ problemId }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const nextUser: Msg = { role: "user", content: text };
    const history = [...messages, nextUser].slice(-8);
    setMessages(history);
    setBusy(true);
    try {
      const res = await fetch(`/api/problems/${problemId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          userMessage: text,
          clientScratch: readRoughWorkNotes(problemId).slice(0, 800),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setMessages((prev) => [...prev, { role: "assistant", content: String(data.reply ?? "") }]);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className="panel flex h-full min-h-0 flex-col gap-2 !p-3"
      aria-label="Gemini coach chat"
    >
      <div className="shrink-0">
        <h2 className="font-display text-sm tracking-wide">Coach</h2>
        <p className="text-[10px] text-[var(--ink-muted)] leading-snug mt-0.5">
          Ask about this quest. Short replies; last few turns only. Full solutions only if you ask
          explicitly.
        </p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto space-y-2 rounded border border-[#b0893d]/35 bg-[#fffdf8]/70 p-2 text-xs"
      >
        {messages.length === 0 ? (
          <p className="text-[var(--ink-muted)] italic">Ask about constraints, edge cases, or your approach…</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={
                m.role === "user"
                  ? "rounded bg-[#f3e6c8]/80 px-2 py-1.5 text-[var(--ink)]"
                  : "rounded border-l-2 border-[var(--gold)] pl-2 text-[var(--ink-muted)]"
              }
            >
              <span className="font-display text-[9px] uppercase tracking-wide block mb-0.5 opacity-70">
                {m.role === "user" ? "You" : "Coach"}
              </span>
              {m.role === "assistant" ? (
                <GeminiText className="text-xs">
                  {m.content}
                </GeminiText>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              )}
            </div>
          ))
        )}
      </div>

      {error ? <p className="shrink-0 text-[10px] text-[var(--ember)]">{error}</p> : null}

      <div className="flex shrink-0 gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask about this problem…"
          className="flex-1 text-xs"
          disabled={busy}
        />
        <button
          type="button"
          className="btn-primary text-xs py-1.5 px-3 shrink-0"
          disabled={busy || !input.trim()}
          onClick={() => void send()}
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </aside>
  );
}
