import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { applyCooldown } from "@/lib/hub/cooldown";
import { createLobbyFromReadyCheck } from "@/lib/hub/lobby";

export type RespondResult =
  | { ok: true; finalized: boolean }
  | { ok: false; error: "not_found" | "expired" | "not_participant" | "already_responded" };

/**
 * Игрок принимает/отклоняет ready-check.
 * Decline моментально проваливает чек (как FACEIT).
 */
export async function respondReady(
  readyCheckId: string,
  userId: string,
  accept: boolean
): Promise<RespondResult> {
  const inner = await prisma.$transaction(async (tx) => {
    const rc = await tx.hubReadyCheck.findUnique({
      where: { id: readyCheckId },
      select: { id: true, state: true, expiresAt: true },
    });
    if (!rc) return { ok: false as const, error: "not_found" as const };
    if (rc.state !== "PENDING") {
      return { ok: false as const, error: "expired" as const };
    }
    if (rc.expiresAt < new Date()) {
      return { ok: false as const, error: "expired" as const };
    }

    const response = await tx.hubReadyResponse.findUnique({
      where: { readyCheckId_userId: { readyCheckId, userId } },
      select: { id: true, accepted: true },
    });
    if (!response) {
      return { ok: false as const, error: "not_participant" as const };
    }
    if (response.accepted !== null) {
      return { ok: false as const, error: "already_responded" as const };
    }

    await tx.hubReadyResponse.update({
      where: { id: response.id },
      data: { accepted: accept, respondedAt: new Date() },
    });

    return { ok: true as const, accept };
  });

  if (!inner.ok) return inner;

  // Decline → сразу провал. Accept → проверяем, все ли уже приняли.
  if (!inner.accept) {
    await expireReadyCheck(readyCheckId, "DECLINE");
    return { ok: true, finalized: true };
  }

  const finalized = await tryFinalize(readyCheckId);
  return { ok: true, finalized };
}

/**
 * Если все 10 ответили accepted=true — переводим ready-check в ACCEPTED,
 * а тикеты в MATCHED. Создание лобби — этап 3 (пока не делаем).
 */
export async function tryFinalize(readyCheckId: string): Promise<boolean> {
  const accepted = await prisma.$transaction(
    async (tx) => {
      const responses = await tx.hubReadyResponse.findMany({
        where: { readyCheckId },
        select: { accepted: true, userId: true },
      });
      if (responses.length === 0) return false;
      if (responses.some((r) => r.accepted !== true)) return false;

      // Атомарно переключаем state. Только один transaction победит.
      const updated = await tx.hubReadyCheck.updateMany({
        where: { id: readyCheckId, state: "PENDING" },
        data: { state: "ACCEPTED" },
      });
      if (updated.count === 0) return false;

      await tx.hubQueueTicket.updateMany({
        where: { readyCheckId },
        data: { status: "MATCHED" },
      });

      await tx.hubAuditEvent.createMany({
        data: responses.map((r) => ({
          userId: r.userId,
          kind: "READY_CHECK_ACCEPTED",
          payload: { readyCheckId },
        })),
      });

      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (accepted) {
    // Создаём лобби после успешной финализации (вне транзакции — там своя)
    await createLobbyFromReadyCheck(readyCheckId).catch(() => null);
  }
  return accepted;
}

/**
 * Проваливает ready-check: виновники получают cooldown и выкидываются из очереди,
 * остальные возвращаются в SEARCHING.
 *
 * reason:
 *  - "DECLINE" — кто-то нажал Decline
 *  - "TIMEOUT" — истёк expiresAt
 */
export async function expireReadyCheck(
  readyCheckId: string,
  reason: "DECLINE" | "TIMEOUT"
): Promise<void> {
  const data = await prisma.$transaction(async (tx) => {
    const rc = await tx.hubReadyCheck.findUnique({
      where: { id: readyCheckId },
      select: { state: true },
    });
    if (!rc || rc.state !== "PENDING") return null;

    const responses = await tx.hubReadyResponse.findMany({
      where: { readyCheckId },
      select: { userId: true, accepted: true },
    });

    // Виновники = не ответили или declined
    const offenders = responses
      .filter((r) => r.accepted !== true)
      .map((r) => r.userId);
    const acceptors = responses
      .filter((r) => r.accepted === true)
      .map((r) => r.userId);

    // Меняем state, чтобы только одна транзакция победила
    const updated = await tx.hubReadyCheck.updateMany({
      where: { id: readyCheckId, state: "PENDING" },
      data: { state: "FAILED" },
    });
    if (updated.count === 0) return null;

    // Виновники: вылетают из очереди (тикет удаляется)
    if (offenders.length > 0) {
      await tx.hubQueueTicket.deleteMany({
        where: { userId: { in: offenders } },
      });
    }
    // Принявшие: возвращаются в SEARCHING
    if (acceptors.length > 0) {
      await tx.hubQueueTicket.updateMany({
        where: { userId: { in: acceptors } },
        data: { status: "SEARCHING", readyCheckId: null },
      });
    }

    return { offenders, acceptors };
  });

  if (!data) return;

  // Cooldown — после транзакции, чтобы внутренний $transaction в applyCooldown
  // не оказался во вложенной транзакции (Prisma это поддерживает плохо).
  const kind = reason === "DECLINE" ? "READY_DECLINE" : "READY_TIMEOUT";
  for (const userId of data.offenders) {
    await applyCooldown(userId, kind, { readyCheckId }).catch(() => undefined);
  }
}

export type ReadyCheckSnapshot = {
  id: string;
  state: "PENDING" | "ACCEPTED" | "FAILED";
  expiresAt: string;
  participants: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    accepted: boolean | null;
  }[];
  acceptedCount: number;
  /** Если создано лобби — id, чтобы клиент сделал redirect. На этапе 2 всегда null. */
  lobbyId: string | null;
};

export async function getReadyCheckSnapshot(
  readyCheckId: string
): Promise<ReadyCheckSnapshot | null> {
  const rc = await prisma.hubReadyCheck.findUnique({
    where: { id: readyCheckId },
    select: {
      id: true,
      state: true,
      expiresAt: true,
      lobby: { select: { id: true } },
      responses: {
        select: {
          accepted: true,
          userId: true,
        },
      },
    },
  });
  if (!rc) return null;

  // Подтянем username/avatar по userId (отдельным запросом — простая выборка)
  const users = await prisma.user.findMany({
    where: { id: { in: rc.responses.map((r) => r.userId) } },
    select: { id: true, username: true, avatarUrl: true },
  });
  const usersById = new Map(users.map((u) => [u.id, u]));

  const participants = rc.responses.map((r) => {
    const u = usersById.get(r.userId);
    return {
      userId: r.userId,
      username: u?.username ?? "Unknown",
      avatarUrl: u?.avatarUrl ?? null,
      accepted: r.accepted,
    };
  });

  return {
    id: rc.id,
    state: rc.state as ReadyCheckSnapshot["state"],
    expiresAt: rc.expiresAt.toISOString(),
    participants,
    acceptedCount: participants.filter((p) => p.accepted === true).length,
    lobbyId: rc.lobby?.id ?? null,
  };
}
