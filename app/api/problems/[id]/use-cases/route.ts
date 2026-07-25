import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBusinessUseCases, useCasesMentionPattern } from "@/lib/gemini";
import { getOrCreateUser } from "@/lib/xp";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const user = await getOrCreateUser();
    const problem = await prisma.problem.findFirst({
      where: { id, userId: user.id },
    });
    if (!problem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cached = problem.businessUseCases;
    if (
      Array.isArray(cached) &&
      cached.length >= 3 &&
      !useCasesMentionPattern(cached.map(String), problem.patternPrimary)
    ) {
      return NextResponse.json({ useCases: cached });
    }

    const useCases = await generateBusinessUseCases(
      problem.title,
      problem.patternPrimary,
      problem.statement,
      undefined,
      user.id,
    );

    await prisma.problem.update({
      where: { id: problem.id },
      data: { businessUseCases: useCases },
    });

    return NextResponse.json({ useCases });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to load use cases",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

/** Session regenerate — does NOT overwrite Problem.businessUseCases. */
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
    const hint = typeof body.hint === "string" ? body.hint.trim().slice(0, 200) : undefined;

    const useCases = await generateBusinessUseCases(
      problem.title,
      problem.patternPrimary,
      problem.statement,
      hint || undefined,
      user.id,
    );

    return NextResponse.json({ useCases, sessionOnly: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to regenerate use cases",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
