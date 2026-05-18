import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser } from "@/lib/hub/auth";

/**
 * Создаёт 9 ботов и ставит их в очередь, чтобы пользователь мог
 * проверить полный flow один. Боты auto-accept в ready-check (см. runTick).
 *
 * Доступно:
 *  - всегда в dev (NODE_ENV != production)
 *  - админу в production (для проверки flow на проде)
 */
export async function POST() {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }

  if (process.env.NODE_ENV === "production" && !auth.user.isAdmin) {
    return NextResponse.json({ error: "admin_only_in_prod" }, { status: 403 });
  }

  const created: string[] = [];
  for (let i = 1; i <= 9; i++) {
    const steamId = `bot_${i.toString().padStart(2, "0")}`;
    const username = `BOT_${i.toString().padStart(2, "0")}`;

    const user = await prisma.user.upsert({
      where: { steamId },
      create: { steamId, username, hubElo: 1000 },
      update: {},
      select: { id: true, hubElo: true },
    });

    // Если бот уже в очереди — пропустить
    const existing = await prisma.hubQueueTicket.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.hubQueueTicket.create({
      data: {
        userId: user.id,
        elo: user.hubElo,
        status: "SEARCHING",
      },
    });
    created.push(username);
  }

  return NextResponse.json({ ok: true, created });
}
