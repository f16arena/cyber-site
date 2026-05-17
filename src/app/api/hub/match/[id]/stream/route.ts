import { getHubUser } from "@/lib/hub/auth";
import { getMatchSnapshot } from "@/lib/hub/match";
import { runTick } from "@/lib/hub/tick";
import { createSseStream } from "@/lib/hub/sse";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error.kind }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;
  const initial = await getMatchSnapshot(id);
  if (!initial) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Только участник матча
  const isParticipant =
    initial.teamA.some((p) => p.steamId === auth.user.steamId) ||
    initial.teamB.some((p) => p.steamId === auth.user.steamId) ||
    auth.user.isAdmin;
  if (!isParticipant) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return createSseStream({
    signal: req.signal,
    intervalMs: 2000,
    snapshot: async () => {
      await runTick().catch(() => undefined);
      const snap = await getMatchSnapshot(id);
      return snap ?? { id, state: "CANCELLED", missing: true };
    },
    isTerminal: (snap) => {
      const s = snap as { state?: string };
      return s.state === "FINISHED" || s.state === "CANCELLED";
    },
  });
}
