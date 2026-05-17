"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { cancelMatch } from "@/lib/hub/match-result";

export type LobbyActionResult = { ok: true } | { ok: false; error: string };

export async function adminCancelLobby(
  lobbyId: string
): Promise<LobbyActionResult> {
  const admin = await requireAdmin();

  const lobby = await prisma.hubLobby.findUnique({
    where: { id: lobbyId },
    select: { id: true, state: true, matchId: true, serverId: true },
  });
  if (!lobby) return { ok: false, error: "not_found" };
  if (lobby.state === "FINISHED" || lobby.state === "CANCELLED") {
    return { ok: false, error: "already_terminal" };
  }

  // Если у лобби уже создан матч — отменяем через cancelMatch (он освобождает сервер).
  if (lobby.matchId) {
    const res = await cancelMatch(lobby.matchId, "admin_cancel_lobby");
    if (!res.ok && res.error !== "already_finished") {
      return { ok: false, error: res.error };
    }
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.hubLobby.update({
        where: { id: lobbyId },
        data: { state: "CANCELLED" },
      });
      if (lobby.serverId) {
        await tx.hubServer.update({
          where: { id: lobby.serverId },
          data: { status: "FREE", reservedForLobbyId: null },
        });
      }
    });
  }

  await prisma.hubAuditEvent.create({
    data: {
      kind: "ADMIN_CANCEL_LOBBY",
      payload: { lobbyId, by: admin.id } as object,
    },
  });
  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_LOBBY_CANCEL",
      entity: "hub_lobby",
      entityId: lobbyId,
    },
  });

  revalidatePath("/admin/hub/lobbies");
  return { ok: true };
}
