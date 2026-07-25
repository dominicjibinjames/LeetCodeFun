import { NextResponse } from "next/server";
import { resetProblemProgress } from "@/lib/xp";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const result = await resetProblemProgress(id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to reset problem";
    const status = message === "Problem not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
