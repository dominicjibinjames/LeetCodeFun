import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session-user";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const authKey = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  const replaceOthers = body.replaceOthers === true;
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh,
      auth: authKey,
    },
    update: {
      userId: user.id,
      p256dh,
      auth: authKey,
    },
  });

  if (replaceOthers) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, NOT: { endpoint } },
    });
  }

  const remaining = await prisma.pushSubscription.count({ where: { userId: user.id } });
  return NextResponse.json({ ok: true, remaining });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id, endpoint },
    });
  } else {
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
  }
  return NextResponse.json({ ok: true });
}
