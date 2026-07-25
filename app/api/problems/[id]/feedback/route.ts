import { NextResponse } from "next/server";
import { generatePatternFeedback } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/xp";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const user = await getOrCreateUser();
    const problem = await prisma.problem.findFirst({
      where: { id, userId: user.id },
    });
    if (!problem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const stage = body.stage === "final" ? "final" : "mid";

    const feedback = await generatePatternFeedback({
      title: problem.title,
      patternPrimary: problem.patternPrimary,
      difficulty: problem.difficulty,
      patternGuess: String(body.patternGuess ?? "").slice(0, 120),
      justification: String(body.patternJustification ?? body.justification ?? "").slice(0, 400),
      explanation: String(body.explanation ?? "").slice(0, 600),
      timeComplexity: String(body.timeComplexity ?? "").slice(0, 80),
      spaceComplexity: String(body.spaceComplexity ?? "").slice(0, 80),
      complexityWhy: String(body.complexityWhy ?? "").slice(0, 300),
      confidence: Number(body.confidenceRating ?? body.confidence ?? 3) || 3,
      passedLeetCode:
        body.passedLeetCode === true ? true : body.passedLeetCode === false ? false : null,
      code: String(body.code ?? "").slice(0, 1200),
      scratch: typeof body.clientScratch === "string" ? body.clientScratch.slice(0, 800) : undefined,
      stage,
      userId: user.id,
    });

    return NextResponse.json({ feedback });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Feedback failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
