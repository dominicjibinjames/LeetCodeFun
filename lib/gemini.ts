import { GoogleGenerativeAI } from "@google/generative-ai";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

/**
 * Prefer Gemini 3.5 Flash-Lite for RPD / throughput.
 * Override with GEMINI_MODEL in .env if needed.
 */
const DEFAULT_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
] as const;

const MAX_OUTPUT_CHAT = 512;
const MAX_OUTPUT_FEEDBACK = 400;
const MAX_OUTPUT_USE_CASES = 500;

/** Async key resolution: user BYO key, else local-only env override. */
export async function resolveGeminiApiKey(userId: string | null | undefined): Promise<string | null> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { geminiKeyEncrypted: true },
    });
    if (user?.geminiKeyEncrypted) {
      try {
        return decryptSecret(user.geminiKeyEncrypted);
      } catch {
        return null;
      }
    }
  }
  // Local/dev convenience only — never rely on this for production multi-user AI.
  if (process.env.NODE_ENV !== "production" && process.env.GEMINI_API_KEY?.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  return null;
}

async function getClient(userId?: string | null) {
  const key = await resolveGeminiApiKey(userId);
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

export async function userHasGeminiKey(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiKeyEncrypted: true },
  });
  return Boolean(user?.geminiKeyEncrypted);
}

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  if (preferred) {
    return [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)];
  }
  return [...DEFAULT_MODELS];
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function generateText(
  prompt: string,
  opts?: { maxOutputTokens?: number; systemInstruction?: string; userId?: string | null },
): Promise<string> {
  const client = await getClient(opts?.userId);
  if (!client) throw new Error("GEMINI_API_KEY not set");

  let lastError: unknown;
  for (const modelName of modelCandidates()) {
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        ...(opts?.systemInstruction
          ? { systemInstruction: opts.systemInstruction }
          : {}),
        generationConfig: {
          maxOutputTokens: opts?.maxOutputTokens ?? 512,
          temperature: 0.6,
        },
      });
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function patternMentionFlags(cases: string[], pattern: string) {
  const nice = pattern.replace(/_/g, " ").toLowerCase();
  const underscored = pattern.toLowerCase();
  return cases.map((c) => {
    const hay = c.toLowerCase();
    return hay.includes(nice) || hay.includes(underscored);
  });
}

export function useCasesMentionPattern(cases: string[], pattern: string): boolean {
  return patternMentionFlags(cases, pattern).some(Boolean);
}

function stripPatternMentions(cases: string[], pattern: string): string[] {
  const nice = pattern.replace(/_/g, " ");
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reNice = new RegExp(escape(nice), "gi");
  const reUnder = new RegExp(escape(pattern), "gi");
  return cases.map((c) =>
    c
      .replace(reNice, "this approach")
      .replace(reUnder, "this approach")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

function fallbackUseCases(title: string, _pattern: string, _statement: string): string[] {
  return [
    `In a backend service, engineers solve problems like "${title}" by scanning records in one efficient pass instead of nested loops.`,
    `In an API or admin dashboard, the same idea helps process user or event data with less CPU and clearer code paths.`,
    `In data cleanup or search features, teams use a careful scan (as in "${title}") to turn a brute-force check into a faster pass.`,
  ];
}

export async function generateBusinessUseCases(
  title: string,
  pattern: string,
  statement: string,
  hint?: string,
  userId?: string | null,
): Promise<string[]> {
  const fallback = stripPatternMentions(fallbackUseCases(title, pattern, statement), pattern);
  if (!(await getClient(userId))) {
    return fallback;
  }

  try {
    const hintLine = hint?.trim()
      ? `\nExtra direction from the learner (apply this tone/angle): ${truncate(hint, 200)}`
      : "";
    const nicePattern = pattern.replace(/_/g, " ");

    const prompt = `Give 3 real software-engineering use cases that illustrate the SAME KIND of approach used in this problem. Keep the language SIMPLE.

Problem name: ${title}
Problem idea: ${truncate(statement, 400)}${hintLine}

Internal coaching note (DO NOT write this label or close synonyms in the output): the interview pattern family is "${nicePattern}".

Rules:
- Return ONLY a JSON array of exactly 3 strings. No markdown.
- Each string: 1-2 short sentences (max ~35 words total).
- Stay in software engineering: APIs, backends, databases, logs, caches, search, auth, message queues, dashboards, ETL jobs, web/mobile app code, etc.
- Do NOT use cute non-tech examples (shopping lists, school grades, playlists) unless framed as a real system engineers build and ship.
- Explain like you're talking to a junior engineer: plain words, light jargon only when needed (API, cache, log).
- Clearly say WHAT the system is doing and WHY this approach helps (faster, less memory, fewer bugs).
- Do not name LeetCode or say "this algorithm".
- CRITICAL: Do NOT name the coding pattern or technique (never write "${nicePattern}", "two pointers", "sliding window", "binary search", "DFS", "BFS", "dynamic programming", "DP", "backtracking", "heap", "stack", "queue", "trie", "union find", "greedy", "prefix sum", "kadane", etc.). Describe the behavior in plain English only (e.g. "scan from both ends", "keep a running window of recent events") without the interview buzzword.`;

    const text = await generateText(prompt, {
      maxOutputTokens: MAX_OUTPUT_USE_CASES,
      userId,
    });
    let cases: string[] | null = null;
    try {
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        cases = parsed.slice(0, 3).map(String);
      }
    } catch {
      // fall through to line parse
    }
    if (!cases) {
      const lines = text
        .split("\n")
        .map((l) => l.replace(/^[\d.\-\*]+\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      cases = lines.length >= 1 ? lines : fallback;
    }

    return stripPatternMentions(cases, pattern);
  } catch {
    return fallback;
  }
}

export async function socraticNudge(params: {
  title: string;
  patternPrimary: string;
  stage: "pattern" | "explain" | "complexity" | "code";
  patternGuess: string;
  justification: string;
  explanation?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  complexityWhy?: string;
  code?: string;
  scratch?: string;
  userId?: string | null;
}): Promise<string> {
  const offlineNudge = () => {
    if (params.stage === "explain") {
      return "Before coding: what must stay true after each step of your approach? Name that invariant in one sentence.";
    }
    if (params.stage === "complexity") {
      return "For each major step in your approach, ask: how many times does it run, and what extra memory grows with the input?";
    }
    if (params.stage === "code") {
      return "Stuck in code? Pick the smallest failing example and ask: what value should each variable hold after the first iteration? Check defs, indentation, and any ListNode/TreeNode helpers you need to write yourself.";
    }
    const match =
      params.patternGuess.toLowerCase().replace(/\s+/g, "_") ===
      params.patternPrimary.toLowerCase();
    if (match) {
      return "Your pattern label matches the expected family. Can you name the invariant that lets you shrink or grow the search space safely?";
    }
    return `Interesting guess. What property of the input made you reach for ${params.patternGuess} instead of ${params.patternPrimary.replace(/_/g, " ")}?`;
  };

  if (!(await getClient(params.userId))) return offlineNudge();

  const stageFocus =
    params.stage === "pattern"
      ? "Focus on pattern identification and why this pattern fits (not the full algorithm)."
      : params.stage === "explain"
        ? "Focus on clarifying their approach / explanation / pseudocode. Push for invariants and edge cases."
        : params.stage === "complexity"
          ? "Focus on time and space complexity. Challenge vague Big-O, O(1) claims that allocate O(n) structures, and missing dominant terms. Do not reveal the optimal answer outright — nudge them to justify."
          : "Focus on debugging Python code: incomplete defs, indentation, missing ListNode/TreeNode/helpers written from scratch, obvious syntax issues. Ask about a tiny example — do not paste a full LeetCode solution.";

  try {
    const prompt = `Be a light Socratic coach for interview prep. Do NOT grade harshly or reveal the full solution.
Problem: ${params.title}
Expected pattern family: ${params.patternPrimary}
Current stage: ${params.stage}
${stageFocus}

Student pattern guess: ${params.patternGuess || "(none)"}
Justification: ${(params.justification || "").slice(0, 400) || "(none)"}
Explanation: ${(params.explanation || "").slice(0, 500) || "(none)"}
Time complexity claim: ${(params.timeComplexity || "").slice(0, 80) || "(none)"}
Space complexity claim: ${(params.spaceComplexity || "").slice(0, 80) || "(none)"}
Complexity why: ${(params.complexityWhy || "").slice(0, 300) || "(none)"}
Code snippet: ${(params.code || "").slice(0, 1200) || "(none)"}
Scratch notes: ${(params.scratch || "").slice(0, 400) || "(none)"}

Reply in 2-3 short sentences with a nudge for THIS stage. No full LeetCode solution.`;

    return await generateText(prompt, { maxOutputTokens: 220, userId: params.userId });
  } catch {
    return offlineNudge();
  }
}

export type CoachChatMessage = { role: "user" | "assistant"; content: string };

export type CoachProblemContext = {
  title: string;
  patternPrimary: string;
  statement: string;
  difficulty: string;
};

const COACH_SYSTEM = `You are a guided interview coach inside Kingdom of Patterngard.
Policy:
- Help the learner reason about THIS problem: clarify constraints, edge cases, complexity, and approaches.
- Pseudocode and approach sketches are OK when asked.
- Do NOT paste a full LeetCode-ready solution unless the user explicitly asks for the full solution / complete code.
- Prefer short replies (3–6 sentences or a short bullet list). No fluff.
- Formatting: light Markdown is OK (*italics*, **bold**, \`code\`, short lists). For formulas, use standard LaTeX with $...$ or $$...$$ (the UI renders KaTeX). Prefer readable math over dumping raw backslashes outside math delimiters.`;

export async function coachChatTurn(params: {
  problem: CoachProblemContext;
  history: CoachChatMessage[];
  userMessage: string;
  scratch?: string;
  userId?: string | null;
}): Promise<string> {
  const offline = () =>
    "Add your Gemini API key in Settings (after signing in) to unlock the full Coach. Until then: what invariant must stay true after each step of your approach?";

  if (!(await getClient(params.userId))) return offline();

  const historySlice = params.history.slice(-6).map((m) => ({
    role: m.role,
    content: truncate(m.content, 500),
  }));

  const scratch = params.scratch?.trim()
    ? `\nLearner scratch notes (truncated):\n${truncate(params.scratch, 800)}`
    : "";

  const prompt = `Problem context (do not repeat back unless asked):
Title: ${params.problem.title}
Difficulty: ${params.problem.difficulty}
Pattern family: ${params.problem.patternPrimary}
Statement: ${truncate(params.problem.statement, 500)}
${scratch}

Recent conversation:
${historySlice.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n") || "(none)"}

USER: ${truncate(params.userMessage, 500)}

Reply as ASSISTANT only — no role labels.`;

  try {
    return await generateText(prompt, {
      maxOutputTokens: MAX_OUTPUT_CHAT,
      systemInstruction: COACH_SYSTEM,
      userId: params.userId,
    });
  } catch {
    return offline();
  }
}

export type PatternFeedback = {
  wentWrong: string[];
  improve: string[];
  patternFocus: string;
};

function fallbackFeedback(patternPrimary: string): PatternFeedback {
  const nice = patternPrimary.replace(/_/g, " ");
  return {
    wentWrong: [
      "Could not reach the coach — review whether your pattern label and justification match the input properties.",
    ],
    improve: [
      `Re-state the invariant for ${nice} in one sentence before coding.`,
      "List 2 edge cases and walk them by hand.",
    ],
    patternFocus: `Build ${nice} competence by naming the invariant first, then coding the smallest correct pass.`,
  };
}

export async function generatePatternFeedback(params: {
  title: string;
  patternPrimary: string;
  difficulty: string;
  patternGuess: string;
  justification: string;
  explanation: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  complexityWhy?: string;
  confidence: number;
  passedLeetCode: boolean | null;
  code: string;
  scratch?: string;
  stage: "mid" | "final";
  userId?: string | null;
}): Promise<PatternFeedback> {
  const fallback = fallbackFeedback(params.patternPrimary);
  if (!(await getClient(params.userId))) return fallback;

  const scratch = params.scratch?.trim()
    ? `\nScratch notes: ${truncate(params.scratch, 800)}`
    : "";
  const passLine =
    params.passedLeetCode == null
      ? "LeetCode result: not reported yet"
      : `LeetCode result: ${params.passedLeetCode ? "passed" : "failed/skipped"}`;

  const prompt = `Grade this learner's work for interview-pattern competency. Be honest and concise.
Do NOT dump a full coded solution.

Problem: ${params.title} (${params.difficulty})
Catalog pattern family: ${params.patternPrimary}
Stage: ${params.stage === "final" ? "after attempt" : "mid-solve check"}

Learner pattern guess: ${truncate(params.patternGuess, 120)}
Justification: ${truncate(params.justification, 400)}
Explanation/approach: ${truncate(params.explanation, 600)}
Time complexity: ${truncate(params.timeComplexity || "(none)", 80)}
Space complexity: ${truncate(params.spaceComplexity || "(none)", 80)}
Complexity why: ${truncate(params.complexityWhy || "(none)", 300)}
Confidence 1-5: ${params.confidence}
${passLine}
Code (truncated): ${truncate(params.code || "(none yet)", 1200)}
${scratch}

Return ONLY JSON:
{"wentWrong":["...","..."],"improve":["...","..."],"patternFocus":"..."}
Rules:
- wentWrong: 1-3 short bullets (what is weak or wrong). Use [] if nothing major yet.
- improve: 1-3 actionable bullets to build competency in ${params.patternPrimary}.
- patternFocus: 1-2 sentences on how to get better at this pattern family.
- No markdown fences.`;

  try {
    const text = await generateText(prompt, {
      maxOutputTokens: MAX_OUTPUT_FEEDBACK,
      userId: params.userId,
    });
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned) as PatternFeedback;
    return {
      wentWrong: Array.isArray(parsed.wentWrong)
        ? parsed.wentWrong.map(String).slice(0, 3)
        : fallback.wentWrong,
      improve: Array.isArray(parsed.improve)
        ? parsed.improve.map(String).slice(0, 3)
        : fallback.improve,
      patternFocus:
        typeof parsed.patternFocus === "string" && parsed.patternFocus.trim()
          ? truncate(parsed.patternFocus, 280)
          : fallback.patternFocus,
    };
  } catch {
    return fallback;
  }
}
