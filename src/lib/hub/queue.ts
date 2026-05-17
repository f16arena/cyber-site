import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const QUEUE_SIZE = 10;
export const READY_CHECK_DURATION_MS = 30_000;

export type QueueJoinResult =
  | { ok: true; ticketId: string; readyCheckId: string | null }
  | { ok: false; error: "already_in_queue" | "in_ready_check" | "in_lobby" | "in_match" };

/**
 * Ставит игрока в очередь. Если уже в очереди / ready-check / лобби / матче — отказ.
 * После успешного join пытается сразу сформировать матч.
 */
export async function joinQueue(userId: string): Promise<QueueJoinResult> {
  const result = await prisma.$transaction(async (tx) => {
    // Если уже в очереди — вернуть существующий тикет
    const existing = await tx.hubQueueTicket.findUnique({
      where: { userId },
      select: { id: true, status: true, readyCheckId: true },
    });
    if (existing) {
      if (existing.status === "SEARCHING") {
        return {
          ok: true as const,
          ticketId: existing.id,
          readyCheckId: null,
        };
      }
      if (existing.status === "READY_CHECK") {
        return {
          ok: true as const,
          ticketId: existing.id,
          readyCheckId: existing.readyCheckId,
        };
      }
      if (existing.status === "MATCHED") {
        return { ok: false as const, error: "in_lobby" as const };
      }
    }

    // Активное лобби пользователя — нельзя в очередь, если уже играет
    const activeLobbyPlayer = await tx.hubLobbyPlayer.findFirst({
      where: {
        userId,
        lobby: {
          state: {
            in: ["CAPTAIN_SELECT", "PICKING", "VETO", "SERVER_ALLOCATION", "LIVE"],
          },
        },
      },
      select: { id: true },
    });
    if (activeLobbyPlayer) {
      return { ok: false as const, error: "in_lobby" as const };
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { hubElo: true },
    });
    if (!user) {
      return { ok: false as const, error: "in_match" as const };
    }

    const ticket = await tx.hubQueueTicket.create({
      data: {
        userId,
        elo: user.hubElo,
        status: "SEARCHING",
      },
      select: { id: true },
    });

    await tx.hubAuditEvent.create({
      data: { userId, kind: "QUEUE_JOIN" },
    });

    return { ok: true as const, ticketId: ticket.id, readyCheckId: null };
  });

  return result;
}

/**
 * Убирает игрока из очереди. Если был в ready-check — это считается dodge, но это
 * обрабатывает уже respondReady(decline=null).
 */
export async function leaveQueue(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.hubQueueTicket.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (!ticket) return { ok: true as const };

    if (ticket.status === "READY_CHECK") {
      return { ok: false as const, error: "in_ready_check" };
    }

    await tx.hubQueueTicket.delete({ where: { id: ticket.id } });
    await tx.hubAuditEvent.create({
      data: { userId, kind: "QUEUE_LEAVE" },
    });
    return { ok: true as const };
  });
}

/**
 * Атомарно пытается собрать матч из 10 SEARCHING-игроков.
 * Использует SELECT FOR UPDATE SKIP LOCKED, чтобы параллельные вызовы не дрались.
 * Возвращает id созданного ready-check, либо null если игроков меньше 10.
 */
export async function tryFormMatch(): Promise<string | null> {
  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; userId: string; elo: number }[]>(
        Prisma.sql`
          SELECT id, "userId", elo
          FROM "HubQueueTicket"
          WHERE status = 'SEARCHING'
          ORDER BY "joinedAt" ASC
          LIMIT ${QUEUE_SIZE}
          FOR UPDATE SKIP LOCKED
        `
      );

      if (locked.length < QUEUE_SIZE) return null;

      const userIds = locked.map((t) => t.userId);
      const ticketIds = locked.map((t) => t.id);
      const expiresAt = new Date(Date.now() + READY_CHECK_DURATION_MS);

      const readyCheck = await tx.hubReadyCheck.create({
        data: {
          state: "PENDING",
          expiresAt,
          responses: {
            create: userIds.map((uid) => ({ userId: uid })),
          },
        },
        select: { id: true },
      });

      await tx.hubQueueTicket.updateMany({
        where: { id: { in: ticketIds } },
        data: { status: "READY_CHECK", readyCheckId: readyCheck.id },
      });

      await tx.hubAuditEvent.createMany({
        data: userIds.map((uid) => ({
          userId: uid,
          kind: "READY_CHECK_STARTED",
          payload: { readyCheckId: readyCheck.id },
        })),
      });

      return readyCheck.id;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export type QueueSnapshot = {
  ticket: {
    id: string;
    status: "SEARCHING" | "READY_CHECK" | "MATCHED" | "CANCELLED";
    joinedAt: string;
    readyCheckId: string | null;
  } | null;
  queueCount: number;
  /** Если попал в активное лобби — куда вести. */
  lobbyId: string | null;
};

/** Снапшот состояния очереди для конкретного пользователя — пушится по SSE. */
export async function getQueueSnapshot(userId: string): Promise<QueueSnapshot> {
  const [ticket, queueCount, activeLobbyPlayer] = await Promise.all([
    prisma.hubQueueTicket.findUnique({
      where: { userId },
      select: { id: true, status: true, joinedAt: true, readyCheckId: true },
    }),
    prisma.hubQueueTicket.count({ where: { status: "SEARCHING" } }),
    prisma.hubLobbyPlayer.findFirst({
      where: {
        userId,
        lobby: {
          state: {
            in: ["CAPTAIN_SELECT", "PICKING", "VETO", "SERVER_ALLOCATION", "LIVE"],
          },
        },
      },
      select: { lobbyId: true },
    }),
  ]);

  return {
    ticket: ticket
      ? {
          id: ticket.id,
          status: ticket.status,
          joinedAt: ticket.joinedAt.toISOString(),
          readyCheckId: ticket.readyCheckId,
        }
      : null,
    queueCount,
    lobbyId: activeLobbyPlayer?.lobbyId ?? null,
  };
}
