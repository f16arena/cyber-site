import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Cleanup старых pending-запросов и прочитанных уведомлений.
 * Vercel Cron 1x в день. Защита через CRON_SECRET.
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400_000);

  const [staleFriendReqs, staleTeamReqs, oldReadNotifs, oldUnreadNotifs] =
    await Promise.all([
      prisma.friendship.deleteMany({
        where: { status: "PENDING", createdAt: { lt: thirtyDaysAgo } },
      }),
      prisma.teamJoinRequest.deleteMany({
        where: { status: "PENDING", createdAt: { lt: thirtyDaysAgo } },
      }),
      prisma.notification.deleteMany({
        where: { readAt: { not: null, lt: thirtyDaysAgo } },
      }),
      prisma.notification.deleteMany({
        where: { readAt: null, createdAt: { lt: ninetyDaysAgo } },
      }),
    ]);

  return NextResponse.json({
    staleFriendRequests: staleFriendReqs.count,
    staleTeamRequests: staleTeamReqs.count,
    oldReadNotifications: oldReadNotifs.count,
    oldUnreadNotifications: oldUnreadNotifs.count,
  });
}
