"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { emailMatchResultDispute } from "@/lib/email";

export type ClaimState = { ok?: boolean; error?: string };

/**
 * Капитан команды заявляет результат матча. Если оба капитана подтверждают
 * одинаковый счёт — результат фиксируется автоматически. Если разный — DISPUTED.
 */
export async function claimMatchResult(
  _prev: ClaimState,
  formData: FormData
): Promise<ClaimState> {
  const me = await getCurrentUser();
  if (!me) return { error: "Не авторизован" };

  const matchId = formData.get("matchId") as string | null;
  const scoreA = parseInt((formData.get("scoreA") as string) || "0", 10);
  const scoreB = parseInt((formData.get("scoreB") as string) || "0", 10);
  const map = ((formData.get("map") as string) || "").trim();

  if (!matchId) return { error: "matchId" };
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB))
    return { error: "Неверный счёт" };

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: {
        select: {
          id: true,
          name: true,
          captainId: true,
          captain: { select: { email: true, emailNotifications: true } },
        },
      },
      teamB: {
        select: {
          id: true,
          name: true,
          captainId: true,
          captain: { select: { email: true, emailNotifications: true } },
        },
      },
    },
  });
  if (!match) return { error: "Матч не найден" };
  if (match.status === "FINISHED") return { error: "Матч уже завершён" };

  // Разрешаем капитану одной из команд
  const myTeamId =
    match.teamA?.captainId === me.id
      ? match.teamAId
      : match.teamB?.captainId === me.id
        ? match.teamBId
        : null;
  if (!myTeamId) return { error: "Только капитан команды может заявлять результат" };

  // Записываем заявку
  await prisma.matchResultClaim.upsert({
    where: { matchId_teamId: { matchId, teamId: myTeamId } },
    create: {
      matchId,
      teamId: myTeamId,
      claimedById: me.id,
      scoreA,
      scoreB,
      map: map || null,
      status: "PENDING",
    },
    update: { scoreA, scoreB, map: map || null, status: "PENDING" },
  });

  // Проверяем, есть ли заявка от другой команды и совпадают ли счета
  const claims = await prisma.matchResultClaim.findMany({
    where: { matchId, status: "PENDING" },
  });

  if (claims.length === 2) {
    const [c1, c2] = claims;
    if (c1.scoreA === c2.scoreA && c1.scoreB === c2.scoreB) {
      // Согласованы — фиксируем результат
      const winnerId =
        c1.scoreA > c1.scoreB
          ? match.teamAId
          : c1.scoreB > c1.scoreA
            ? match.teamBId
            : null;

      await prisma.match.update({
        where: { id: matchId },
        data: {
          scoreA: c1.scoreA,
          scoreB: c1.scoreB,
          map: c1.map ?? null,
          winnerId,
          status: "FINISHED",
          finishedAt: new Date(),
        },
      });

      await prisma.matchResultClaim.updateMany({
        where: { matchId },
        data: { status: "CONFIRMED" },
      });

      // Авто-продвижение по сетке
      if (winnerId) {
        await prisma.match.updateMany({
          where: { parentMatchAId: matchId },
          data: { teamAId: winnerId },
        });
        await prisma.match.updateMany({
          where: { parentMatchBId: matchId },
          data: { teamBId: winnerId },
        });
      }
    } else {
      // Конфликт
      await prisma.matchResultClaim.updateMany({
        where: { matchId },
        data: { status: "DISPUTED" },
      });
    }
  } else {
    // Только моя заявка — уведомим соперника
    const opponentTeam =
      myTeamId === match.teamAId ? match.teamB : match.teamA;
    if (opponentTeam) {
      await notify({
        userId: opponentTeam.captainId,
        type: "MATCH_RESULT",
        title: `Подтверди результат матча ${scoreA}:${scoreB}`,
        link: `/matches/${matchId}`,
      });
      if (
        opponentTeam.captain?.email &&
        opponentTeam.captain.emailNotifications
      ) {
        const siteUrl =
          process.env.SITE_URL || "https://cyber-site-five.vercel.app";
        emailMatchResultDispute(
          opponentTeam.captain.email,
          `${siteUrl}/matches/${matchId}`,
          scoreA,
          scoreB
        ).catch(() => {});
      }
    }
  }

  revalidatePath(`/matches/${matchId}`);
  return { ok: true };
}
