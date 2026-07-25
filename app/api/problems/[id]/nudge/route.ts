import { NextResponse } from "next/server";
import { socraticNudge } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getOrCreateUser } from "@/lib/xp";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const user = await getOrCreateUser();
  const limited = rateLimit(`nudge:${user.id}`, 30, 60_000);
  if (!limited.ok) return limited.response;
  const problem = await prisma.problem.findFirst({
    where: { id, userId: user.id },
  });
  if (!problem) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawStage = String(body.stage ?? "pattern");
  const stage =
    rawStage === "explain" ||
    rawStage === "code" ||
    rawStage === "pattern" ||
    rawStage === "complexity"
      ? rawStage
      : ("pattern" as const);

  const nudge = await socraticNudge({
    title: problem.title,
    patternPrimary: problem.patternPrimary,
    stage,
    patternGuess: String(body.patternGuess ?? ""),
    justification: String(body.justification ?? ""),
    explanation: String(body.explanation ?? "").slice(0, 500),
    timeComplexity: String(body.timeComplexity ?? "").slice(0, 80),
    spaceComplexity: String(body.spaceComplexity ?? "").slice(0, 80),
    complexityWhy: String(body.complexityWhy ?? "").slice(0, 300),
    code: String(body.code ?? "").slice(0, 1200),
    scratch: typeof body.clientScratch === "string" ? body.clientScratch.slice(0, 400) : undefined,
    userId: user.id,
  });

  return NextResponse.json({ nudge });
}
