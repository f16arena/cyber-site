import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHubUser } from "@/lib/hub/auth";

/**
 * DEV-ONLY: создаёт 9 ботов и ставит их в очередь, чтобы пользователь мог
 * проверить полный flow один. Боты auto-accept в ready-check (см. runTick).
 *
 * Заблокировано в production.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled_in_prod" }, { status: 403 });
  }

  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
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
