import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { HUB_MAP_POOL, isHubMapId } from "@/lib/hub/maps";

/** Сколько банов делается в BO1: 6 (A/B/A/B/A/B), оставшаяся карта = выбранная. */
export const VETO_BAN_COUNT = 6;

export type VetoResult =
  | {
      ok: true;
      finished: boolean;
      selectedMap: string | null;
      nextTurn: "A" | "B" | null;
    }
  | {
      ok: false;
      error:
        | "lobby_not_found"
        | "wrong_state"
        | "not_captain"
        | "not_your_turn"
        | "invalid_map"
        | "map_already_banned"
        | "veto_already_done";
    };

/**
 * Капитан банит карту. После 6-го бана оставшаяся карта = selectedMap,
 * лобби переходит в SERVER_ALLOCATION.
 */
export async function applyVetoBan(
  lobbyId: string,
  captainUserId: string,
  mapId: string
): Promise<VetoResult> {
  if (!isHubMapId(mapId)) {
    return { ok: false, error: "invalid_map" };
  }

  return prisma.$transaction(
    async (tx) => {
      const lobby = await tx.hubLobby.findUnique({
        where: { id: lobbyId },
        select: {
          id: true,
          state: true,
          vetoTurn: true,
          captainAId: true,
          captainBId: true,
        },
      });
      if (!lobby) return { ok: false as const, error: "lobby_not_found" as const };

      if (lobby.state !== "VETO") {
        if (
          lobby.state === "SERVER_ALLOCATION" ||
          lobby.state === "LIVE" ||
          lobby.state === "FINISHED"
        ) {
          return { ok: false as const, error: "veto_already_done" as const };
        }
        return { ok: false as const, error: "wrong_state" as const };
      }

      const captainTeam: "A" | "B" | null =
        captainUserId === lobby.captainAId
          ? "A"
          : captainUserId === lobby.captainBId
          ? "B"
          : null;
      if (captainTeam === null) {
        return { ok: false as const, error: "not_captain" as const };
      }
      if (captainTeam !== lobby.vetoTurn) {
        return { ok: false as const, error: "not_your_turn" as const };
      }

      const existing = await tx.hubVetoAction.findMany({
        where: { lobbyId },
        select: { map: true, order: true },
        orderBy: { order: "asc" },
      });

      if (existing.some((a) => a.map === mapId)) {
        return { ok: false as const, error: "map_already_banned" as const };
      }
      if (existing.length >= VETO_BAN_COUNT) {
        return { ok: false as const, error: "veto_already_done" as const };
      }

      const nextOrder = existing.length + 1;

      await tx.hubVetoAction.create({
        data: {
          lobbyId,
          team: captainTeam,
          action: "BAN",
          map: mapId,
          order: nextOrder,
        },
      });

      const totalBans = nextOrder;
      const isFinished = totalBans >= VETO_BAN_COUNT;

      if (isFinished) {
        const bannedSet = new Set([
          ...existing.map((a) => a.map),
          mapId,
        ]);
        const remaining = HUB_MAP_POOL.find((m) => !bannedSet.has(m.id));
        if (!remaining) {
          // Логическая невозможность: 7 карт − 6 банов = 1
          throw new Error("veto_finalize_no_remaining_map");
        }

        await tx.hubLobby.update({
          where: { id: lobbyId },
          data: {
            selectedMap: remaining.id,
            state: "SERVER_ALLOCATION",
          },
        });

        await tx.hubAuditEvent.create({
          data: {
            userId: captainUserId,
            kind: "VETO_FINISHED",
            payload: {
              lobbyId,
              selectedMap: remaining.id,
              banSequence: [...existing.map((a) => a.map), mapId],
            },
          },
        });

        return {
          ok: true as const,
          finished: true,
          selectedMap: remaining.id,
          nextTurn: null,
        };
      }

      const nextTurn: "A" | "B" = captainTeam === "A" ? "B" : "A";
      await tx.hubLobby.update({
        where: { id: lobbyId },
        data: { vetoTurn: nextTurn },
      });

      await tx.hubAuditEvent.create({
        data: {
          userId: captainUserId,
          kind: "VETO_BAN",
          payload: { lobbyId, map: mapId, team: captainTeam, order: nextOrder },
        },
      });

      return {
        ok: true as const,
        finished: false,
        selectedMap: null,
        nextTurn,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
