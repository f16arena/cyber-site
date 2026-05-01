import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Tournament lifecycle automation. Vercel Cron 1x в час.
 *
 * 1. REGISTRATION_OPEN → REGISTRATION_CLOSED когда наступает registrationClosesAt
 * 2. ONGOING → COMPLETED когда последний матч (Grand Final) сыгран
 *
 * Защита: CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  if (cronSecret) {
    const ok =
      auth === `Bearer ${cronSecret}` || querySecret === cronSecret;
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Close registration
  const closedReg = await prisma.tournament.updateMany({
    where: {
      status: "REGISTRATION_OPEN",
      registrationClosesAt: { lte: now },
    },
    data: { status: "REGISTRATION_CLOSED" },
  });

  // 2. Mark ONGOING tournaments as COMPLETED if all their matches are finished
  const ongoing = await prisma.tournament.findMany({
    where: { status: "ONGOING" },
    select: {
      id: true,
      matches: { select: { id: true, status: true } },
    },
  });

  let completed = 0;
  for (const t of ongoing) {
    if (t.matches.length === 0) continue;
    const allDone = t.matches.every(
      (m) => m.status === "FINISHED" || m.status === "WALKOVER" || m.status === "CANCELLED"
    );
    if (allDone) {
      await prisma.tournament.update({
        where: { id: t.id },
        data: { status: "COMPLETED", endsAt: now },
      });
      completed++;
    }
  }

  return NextResponse.json({
    registrationsClosed: closedReg.count,
    tournamentsCompleted: completed,
  });
}
