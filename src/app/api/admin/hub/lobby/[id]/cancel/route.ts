import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { cancelMatch } from "@/lib/hub/match-result";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;

  const lobby = await prisma.hubLobby.findUnique({
    where: { id },
    select: { id: true, state: true, matchId: true, serverId: true },
  });
  if (!lobby) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (lobby.state === "FINISHED" || lobby.state === "CANCELLED") {
    return NextResponse.json({ error: "already_terminal" }, { status: 409 });
  }

  if (lobby.matchId) {
    const res = await cancelMatch(lobby.matchId, "admin_cancel_lobby");
    if (!res.ok && res.error !== "already_finished") {
      return NextResponse.json({ error: res.error }, { status: 409 });
    }
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.hubLobby.update({
        where: { id },
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

  return NextResponse.json({ ok: true });
}
