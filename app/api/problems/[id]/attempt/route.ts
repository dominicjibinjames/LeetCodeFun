import { NextResponse } from "next/server";
import { getOrCreateUser, submitAttempt, type AttemptPayload } from "@/lib/xp";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  await getOrCreateUser();
  const body = (await request.json()) as AttemptPayload;

  if (!body.patternGuess || !body.explanation) {
    return NextResponse.json(
      { error: "patternGuess and explanation are required" },
      { status: 400 },
    );
  }

  try {
    const result = await submitAttempt(id, body);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
