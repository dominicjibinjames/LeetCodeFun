import { NextResponse } from "next/server";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";
import { userHasGeminiKey } from "@/lib/gemini";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required", hasKey: false }, { status: 401 });
  }
  return NextResponse.json({ hasKey: await userHasGeminiKey(user.id) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const key = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (key.length < 10) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { geminiKeyEncrypted: encryptSecret(key) },
  });
  return NextResponse.json({ ok: true, hasKey: true });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { geminiKeyEncrypted: null },
  });
  return NextResponse.json({ ok: true, hasKey: false });
}
