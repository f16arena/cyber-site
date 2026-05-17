import { getHubUser } from "@/lib/hub/auth";
import { getLobbySnapshot } from "@/lib/hub/lobby";
import { runTick } from "@/lib/hub/tick";
import { createSseStream } from "@/lib/hub/sse";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.error.kind }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { id } = await params;

  const initial = await getLobbySnapshot(id);
  if (!initial) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Только участник лобби имеет право на стрим
  const isParticipant =
    initial.captainA.userId === auth.user.id ||
    initial.captainB.userId === auth.user.id ||
    initial.teamA.some((p) => p.userId === auth.user.id) ||
    initial.teamB.some((p) => p.userId === auth.user.id) ||
    initial.available.some((p) => p.userId === auth.user.id);
  if (!isParticipant) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return createSseStream({
    signal: req.signal,
    intervalMs: 1000,
    snapshot: async () => {
      await runTick().catch(() => undefined);
      const snap = await getLobbySnapshot(id);
      return snap ?? { id, state: "CANCELLED", missing: true };
    },
    isTerminal: (snap) => {
      const s = snap as { state?: string };
      // Закрываем стрим, когда фаза пика завершена — клиент перейдёт
      // на veto/match/dashboard в зависимости от состояния
      return (
        s.state === "VETO" ||
        s.state === "SERVER_ALLOCATION" ||
        s.state === "LIVE" ||
        s.state === "FINISHED" ||
        s.state === "CANCELLED"
      );
    },
  });
}
