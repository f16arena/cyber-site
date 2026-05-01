import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

/**
 * Напоминание о старте матча — каждые 15 мин Vercel Cron.
 * Шлёт уведомление капитанам команд, чьи матчи начнутся в ближайшие 45-60 минут.
 *
 * Защита: Bearer CRON_SECRET (или ?secret=).
 * Идемпотентность: проверяем что для конкретного matchId уже не отправлялось
 * (по link в Notification).
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
  const windowStart = new Date(now.getTime() + 45 * 60_000);
  const windowEnd = new Date(now.getTime() + 60 * 60_000);

  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      startsAt: { gte: windowStart, lte: windowEnd },
      OR: [{ teamAId: { not: null } }, { teamBId: { not: null } }],
    },
    include: {
      tournament: { select: { name: true, slug: true } },
      teamA: { select: { name: true, captainId: true } },
      teamB: { select: { name: true, captainId: true } },
    },
  });

  let sent = 0;
  for (const m of matches) {
    const captains = new Set<string>();
    if (m.teamA?.captainId) captains.add(m.teamA.captainId);
    if (m.teamB?.captainId) captains.add(m.teamB.captainId);

    const matchLink = m.tournament?.slug
      ? `/tournaments/${m.tournament.slug}#match-${m.id}`
      : `/matches/${m.id}`;

    for (const captainId of captains) {
      const already = await prisma.notification.findFirst({
        where: {
          userId: captainId,
          type: "MATCH_REMINDER",
          link: matchLink,
        },
        select: { id: true },
      });
      if (already) continue;

      const opp =
        m.teamA?.captainId === captainId ? m.teamB?.name : m.teamA?.name;
      const minutesLeft = Math.round(
        (m.startsAt!.getTime() - now.getTime()) / 60_000
      );
      await notify({
        userId: captainId,
        type: "MATCH_REMINDER",
        title: `⏰ Матч через ${minutesLeft} мин`,
        body: opp
          ? `Соперник: ${opp}${m.tournament?.name ? ` · ${m.tournament.name}` : ""}`
          : m.tournament?.name ?? undefined,
        link: matchLink,
      });
      sent++;
    }
  }

  return NextResponse.json({ matches: matches.length, notificationsSent: sent });
}
