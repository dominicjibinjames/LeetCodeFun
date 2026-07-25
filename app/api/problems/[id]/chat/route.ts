import { NextResponse } from "next/server";
import { coachChatTurn, type CoachChatMessage } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getOrCreateUser } from "@/lib/xp";

type Params = { params: Promise<{ id: string }> };

const lastChatAt = new Map<string, number>();
const COOLDOWN_MS = 800;

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const user = await getOrCreateUser();
    const limited = rateLimit(`chat:${user.id}`, 20, 60_000);
    if (!limited.ok) return limited.response;
    const problem = await prisma.problem.findFirst({
      where: { id, userId: user.id },
    });
    if (!problem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = Date.now();
    const prev = lastChatAt.get(user.id) ?? 0;
    if (now - prev < COOLDOWN_MS) {
      return NextResponse.json({ error: "Slow down a moment" }, { status: 429 });
    }
    lastChatAt.set(user.id, now);

    const body = await request.json().catch(() => ({}));
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const clientScratch =
      typeof body.clientScratch === "string" ? body.clientScratch.slice(0, 800) : undefined;

    const history: CoachChatMessage[] = rawMessages
      .filter(
        (m: unknown): m is { role: string; content: string } =>
          !!m &&
          typeof m === "object" &&
          ("role" in m) &&
          ("content" in m) &&
          (m as { role: string }).role !== undefined,
      )
      .map((m: { role: string; content: unknown }) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content ?? "").slice(0, 500),
      }))
      .slice(-8);

    const lastUser = [...history].reverse().find((m) => m.role === "user");
    const userMessage =
      typeof body.userMessage === "string" && body.userMessage.trim()
        ? body.userMessage.trim().slice(0, 500)
        : lastUser?.content ?? "";

    if (!userMessage.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    // History for the model excludes the latest user turn (passed separately)
    const prior = lastUser
      ? history.slice(0, history.lastIndexOf(lastUser)).slice(-6)
      : history.slice(-6);

    const reply = await coachChatTurn({
      problem: {
        title: problem.title,
        patternPrimary: problem.patternPrimary,
        statement: problem.statement,
        difficulty: problem.difficulty,
      },
      history: prior,
      userMessage,
      scratch: clientScratch,
      userId: user.id,
    });

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Chat failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
