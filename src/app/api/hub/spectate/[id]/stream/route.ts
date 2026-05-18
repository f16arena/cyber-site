import { getMatchSnapshot } from "@/lib/hub/match";
import { createSseStream } from "@/lib/hub/sse";

export const dynamic = "force-dynamic";

/**
 * Публичный SSE-стрим матча для зрителей.
 * Без аутентификации — любой может смотреть live.
 * Tick раз в 2 секунды.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const initial = await getMatchSnapshot(id);
  if (!initial) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return createSseStream({
    signal: req.signal,
    intervalMs: 2000,
    snapshot: async () => {
      const snap = await getMatchSnapshot(id);
      return snap ?? { id, state: "CANCELLED", missing: true };
    },
    isTerminal: (snap) => {
      const s = snap as { state?: string };
      return s.state === "FINISHED" || s.state === "CANCELLED";
    },
  });
}
