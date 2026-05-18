import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const QUEUE_SIZE = 10;
export const READY_CHECK_DURATION_MS = 30_000;

export type QueueJoinResult =
  | { ok: true; ticketId: string; readyCheckId: string | null }
  | {
      ok: false;
      error:
        | "already_in_queue"
        | "in_ready_check"
        | "in_lobby"
        | "in_match"
        | "ask_party_leader";
    };

/**
 * Ставит игрока в очередь. Если у игрока есть party:
 *  - и он лидер — создаётся party-ticket для всей party (1 тикет, partySize=N);
 *  - и он не лидер — отказ "ask_party_leader".
 * Если party нет — обычный соло-ticket.
 */
export async function joinQueue(userId: string): Promise<QueueJoinResult> {
  const result = await prisma.$transaction(async (tx) => {
    // Уже в очереди — вернуть тикет (или ticket party-лидера)
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

    // Активное лобби — нельзя в очередь
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

    // Проверим party
    const partyMember = await tx.hubPartyMember.findUnique({
      where: { userId },
      select: {
        partyId: true,
        party: {
          select: {
            id: true,
            leaderId: true,
            members: {
              select: {
                userId: true,
                user: { select: { hubElo: true } },
              },
            },
          },
        },
      },
    });

    if (partyMember && partyMember.party.leaderId !== userId) {
      return { ok: false as const, error: "ask_party_leader" as const };
    }

    if (partyMember) {
      // Лидер party — создаём ticket за всю party
      const party = partyMember.party;
      const members = party.members;
      const avgElo = Math.round(
        members.reduce((sum, m) => sum + m.user.hubElo, 0) / members.length
      );

      // Если кто-то из членов уже в очереди / лобби — отказ
      const memberIds = members.map((m) => m.userId);
      const conflictTicket = await tx.hubQueueTicket.findFirst({
        where: { userId: { in: memberIds }, NOT: { userId } },
        select: { id: true },
      });
      if (conflictTicket) {
        return { ok: false as const, error: "in_lobby" as const };
      }
      const conflictLobby = await tx.hubLobbyPlayer.findFirst({
        where: {
          userId: { in: memberIds },
          lobby: {
            state: {
              in: ["CAPTAIN_SELECT", "PICKING", "VETO", "SERVER_ALLOCATION", "LIVE"],
            },
          },
        },
        select: { id: true },
      });
      if (conflictLobby) {
        return { ok: false as const, error: "in_lobby" as const };
      }

      const ticket = await tx.hubQueueTicket.create({
        data: {
          userId,
          partyId: party.id,
          partySize: members.length,
          elo: avgElo,
          status: "SEARCHING",
        },
        select: { id: true },
      });

      await tx.hubAuditEvent.create({
        data: {
          userId,
          kind: "QUEUE_JOIN",
          payload: { partyId: party.id, partySize: members.length },
        },
      });
      return { ok: true as const, ticketId: ticket.id, readyCheckId: null };
    }

    // Соло
    const ticket = await tx.hubQueueTicket.create({
      data: {
        userId,
        elo: user.hubElo,
        status: "SEARCHING",
        partySize: 1,
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
 * Атомарно пытается собрать матч на 10 мест из SEARCHING-тикетов.
 * Тикет может представлять 1..5 игроков (соло или party).
 * Жадный подбор по времени ожидания (FIFO) — берём пока сумма partySize<=10.
 * Если перебор (например, party=5 + party=5 + party=3 = 13) — пропускаем
 * последний и пытаемся добрать соло.
 */
export async function tryFormMatch(): Promise<string | null> {
  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<
        {
          id: string;
          userId: string;
          elo: number;
          partyId: string | null;
          partySize: number;
        }[]
      >(
        Prisma.sql`
          SELECT id, "userId", elo, "partyId", "partySize"
          FROM "HubQueueTicket"
          WHERE status = 'SEARCHING'
          ORDER BY "joinedAt" ASC
          LIMIT 50
          FOR UPDATE SKIP LOCKED
        `
      );

      // Жадно набираем тикеты пока не получим ровно 10 мест.
      // Если очередной тикет переполнит — пропускаем (но не возвращаем lock).
      const picked: typeof locked = [];
      let totalSize = 0;
      for (const t of locked) {
        if (totalSize + t.partySize <= QUEUE_SIZE) {
          picked.push(t);
          totalSize += t.partySize;
          if (totalSize === QUEUE_SIZE) break;
        }
      }
      if (totalSize !== QUEUE_SIZE) return null;

      // Собираем userId всех попавших (включая членов party)
      const leaderUserIds = picked.map((t) => t.userId);
      const partyIds = picked
        .map((t) => t.partyId)
        .filter((p): p is string => p !== null);

      const partyMembers = partyIds.length
        ? await tx.hubPartyMember.findMany({
            where: { partyId: { in: partyIds } },
            select: { userId: true, partyId: true },
          })
        : [];

      const allUserIds = new Set<string>(leaderUserIds);
      const userToParty = new Map<string, string>();
      for (const pm of partyMembers) {
        allUserIds.add(pm.userId);
        userToParty.set(pm.userId, pm.partyId);
      }

      const ticketIds = picked.map((t) => t.id);
      const expiresAt = new Date(Date.now() + READY_CHECK_DURATION_MS);

      const userIdsArr = Array.from(allUserIds);
      if (userIdsArr.length !== QUEUE_SIZE) {
        // Расхождение между partySize и фактическими членами party — отказ
        return null;
      }

      const readyCheck = await tx.hubReadyCheck.create({
        data: {
          state: "PENDING",
          expiresAt,
          responses: {
            create: userIdsArr.map((uid) => ({ userId: uid })),
          },
        },
        select: { id: true },
      });

      await tx.hubQueueTicket.updateMany({
        where: { id: { in: ticketIds } },
        data: { status: "READY_CHECK", readyCheckId: readyCheck.id },
      });

      await tx.hubAuditEvent.createMany({
        data: userIdsArr.map((uid) => ({
          userId: uid,
          kind: "READY_CHECK_STARTED",
          payload: { readyCheckId: readyCheck.id, partyId: userToParty.get(uid) ?? null },
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
