import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  commonTimezones,
  resolveNotifyHour,
  resolveTimeZone,
} from "@/lib/user-time";
import { getOrCreateUser } from "@/lib/xp";

export async function GET() {
  const user = await getOrCreateUser();
  return NextResponse.json({
    timezone: resolveTimeZone(user.timezone),
    notifyHourLocal: resolveNotifyHour(user.notifyHourLocal),
    timezones: commonTimezones(),
  });
}

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const body = (await request.json().catch(() => ({}))) as {
    timezone?: string;
    notifyHourLocal?: number;
  };

  const data: { timezone?: string; notifyHourLocal?: number } = {};
  if (typeof body.timezone === "string") {
    data.timezone = resolveTimeZone(body.timezone);
  }
  if (typeof body.notifyHourLocal === "number") {
    data.notifyHourLocal = resolveNotifyHour(body.notifyHourLocal);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "timezone and/or notifyHourLocal required" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({
    timezone: resolveTimeZone(updated.timezone),
    notifyHourLocal: resolveNotifyHour(updated.notifyHourLocal),
  });
}
