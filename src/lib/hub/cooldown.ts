import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Длительность cooldown с эскалацией по числу нарушений за последние 24 часа.
 * Считаем нарушения: READY_DECLINE, READY_TIMEOUT, LOBBY_DODGE.
 */
export const COOLDOWN_VIOLATION_KINDS = [
  "READY_DECLINE",
  "READY_TIMEOUT",
  "LOBBY_DODGE",
] as const;

const COOLDOWN_LADDER_MS = [
  5 * 60 * 1000, //   1-е нарушение —  5 минут
  30 * 60 * 1000, //  2-е           — 30 минут
  2 * 60 * 60 * 1000, // 3-е         —  2 часа
  24 * 60 * 60 * 1000, // 4-е и далее — 24 часа
];

export function cooldownDurationFor(violationsLast24h: number): number {
  const idx = Math.min(violationsLast24h - 1, COOLDOWN_LADDER_MS.length - 1);
  return COOLDOWN_LADDER_MS[Math.max(0, idx)];
}

export type CooldownKind = (typeof COOLDOWN_VIOLATION_KINDS)[number];

/**
 * Применяет cooldown к пользователю: пишет audit, считает нарушения за 24ч,
 * ставит User.hubCooldownUntil. Возвращает дату окончания.
 */
export async function applyCooldown(
  userId: string,
  kind: CooldownKind,
  payload?: Prisma.InputJsonValue
): Promise<Date> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    await tx.hubAuditEvent.create({
      data: {
        userId,
        kind,
        ...(payload !== undefined ? { payload } : {}),
      },
    });

    const violations = await tx.hubAuditEvent.count({
      where: {
        userId,
        kind: { in: [...COOLDOWN_VIOLATION_KINDS] },
        createdAt: { gte: since },
      },
    });

    const durationMs = cooldownDurationFor(violations);
    const until = new Date(Date.now() + durationMs);

    await tx.user.update({
      where: { id: userId },
      data: { hubCooldownUntil: until },
    });

    return until;
  });
}
