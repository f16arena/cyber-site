"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { emailMatchResultDispute } from "@/lib/email";
import {
  getPresetSteps,
  resolveVetoPresetId,
  type VetoTeam,
} from "@/lib/veto/presets";
import {
  validateAction,
  isVetoComplete,
  getMatchMaps,
  type AppliedAction,
} from "@/lib/veto/engine";
import { CS2_MAP_POOL } from "@/lib/cs2/maps";

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

/* ─── Veto / Pick&Ban ────────────────────────────────── */

const VETO_STEP_DURATION_SEC = 30;

/**
 * Запуск veto для матча. Может быть вызван админом или авто-триггером
 * за X минут до старта матча. Идемпотентно — если уже запущен, не дублирует.
 */
export async function startMatchVeto(formData: FormData) {
  await requireAdmin();
  const matchId = formData.get("matchId") as string | null;
  if (!matchId) return;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { vetoStartedAt: true, status: true },
  });
  if (!match || match.vetoStartedAt) return;
  if (match.status === "FINISHED") return;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      vetoStartedAt: new Date(),
      vetoEndsAt: null, // обновляется на каждом шаге
    },
  });

  revalidatePath(`/matches/${matchId}/veto`);
  revalidatePath(`/matches/${matchId}`);
}

/**
 * Капитан подаёт BAN или PICK. Валидируется через veto-engine.
 * При завершении veto — выставляет map (BO1) или mapsPlayed (BO3/5) +
 * переводит матч в статус LIVE.
 */
export async function submitVetoAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) {
    redirect("/api/auth/steam");
  }

  const matchId = formData.get("matchId") as string | null;
  const map = (formData.get("map") as string | null)?.trim() ?? "";
  if (!matchId || !map) return;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { select: { id: true, captainId: true } },
      teamB: { select: { id: true, captainId: true } },
      tournament: {
        select: { mapPool: true, vetoPreset: true },
      },
      vetoActions: {
        orderBy: { order: "asc" },
      },
    },
  });
  if (!match) return;
  if (!match.vetoStartedAt) return;
  if (match.status === "FINISHED") return;

  // Капитан какой команды?
  let myTeam: VetoTeam | null = null;
  if (match.teamA?.captainId === me.id) myTeam = "A";
  else if (match.teamB?.captainId === me.id) myTeam = "B";
  if (!myTeam) return;

  // Пул карт
  const mapPool = Array.isArray(match.tournament?.mapPool)
    ? (match.tournament!.mapPool as string[])
    : CS2_MAP_POOL.map((m) => m.id);

  // Пресет
  const presetId = resolveVetoPresetId(
    match.tournament?.vetoPreset ?? "AUTO",
    match.bestOf
  );
  const preset = getPresetSteps(presetId);

  // Текущее состояние
  const applied: AppliedAction[] = match.vetoActions.map((a) => ({
    team: a.team as VetoTeam,
    action: a.action as "BAN" | "PICK" | "DECIDER",
    map: a.map,
    order: a.order,
  }));
  const state = { preset, applied, mapPool };

  // Какое действие должно быть текущим шагом
  const idx = applied.length;
  const step = idx < preset.length ? preset[idx] : null;
  if (!step) return;

  const validation = validateAction(state, {
    team: myTeam,
    action: step.action,
    map,
  });
  if (!validation.ok) return;

  // Создаём запись
  await prisma.matchVetoAction.create({
    data: {
      matchId,
      team: myTeam,
      action: step.action,
      map,
      order: idx + 1,
      decidedBy: me.id,
    },
  });

  // Перечитываем actions, чтобы проверить завершение
  const allActions = await prisma.matchVetoAction.findMany({
    where: { matchId },
    orderBy: { order: "asc" },
  });
  const newState = {
    preset,
    applied: allActions.map((a) => ({
      team: a.team as VetoTeam,
      action: a.action as "BAN" | "PICK" | "DECIDER",
      map: a.map,
      order: a.order,
    })),
    mapPool,
  };

  if (isVetoComplete(newState)) {
    const finalMaps = getMatchMaps(newState);
    // Decider — последняя оставшаяся карта — записать в БД
    const decider = finalMaps[finalMaps.length - 1];
    if (decider) {
      await prisma.matchVetoAction.create({
        data: {
          matchId,
          team: "A", // decider не привязан к команде, ставим A для @@unique
          action: "DECIDER",
          map: decider,
          order: allActions.length + 1,
          decidedBy: null,
        },
      });
    }

    // Для BO1 — записываем выбранную карту. Для BO3/5 — mapsPlayed.
    if (match.bestOf <= 1) {
      await prisma.match.update({
        where: { id: matchId },
        data: { map: finalMaps[0] ?? null },
      });
    } else {
      await prisma.match.update({
        where: { id: matchId },
        data: {
          mapsPlayed: finalMaps.map((m) => ({
            map: m,
            scoreA: 0,
            scoreB: 0,
            winner: null,
          })),
        },
      });
    }

    // Уведомляем капитанов
    if (match.teamA?.captainId && match.teamB?.captainId) {
      const mapsText = finalMaps.join(", ");
      await Promise.all([
        notify({
          userId: match.teamA.captainId,
          type: "MATCH_RESULT",
          title: `Veto завершён: ${mapsText}`,
          link: `/matches/${matchId}`,
        }),
        notify({
          userId: match.teamB.captainId,
          type: "MATCH_RESULT",
          title: `Veto завершён: ${mapsText}`,
          link: `/matches/${matchId}`,
        }),
      ]);
    }
  } else {
    // Сдвинуть таймер шага
    await prisma.match.update({
      where: { id: matchId },
      data: {
        vetoEndsAt: new Date(Date.now() + VETO_STEP_DURATION_SEC * 1000),
      },
    });
  }

  revalidatePath(`/matches/${matchId}/veto`);
  revalidatePath(`/matches/${matchId}`);
}

/** Админ-сброс veto (на случай если что-то пошло не так). */
export async function resetMatchVeto(formData: FormData) {
  await requireAdmin();
  const matchId = formData.get("matchId") as string | null;
  if (!matchId) return;

  await prisma.matchVetoAction.deleteMany({ where: { matchId } });
  await prisma.match.update({
    where: { id: matchId },
    data: {
      vetoStartedAt: null,
      vetoEndsAt: null,
      map: null,
      mapsPlayed: undefined,
    },
  });

  revalidatePath(`/matches/${matchId}/veto`);
  revalidatePath(`/matches/${matchId}`);
}
