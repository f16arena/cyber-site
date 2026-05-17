import { getHubUser } from "@/lib/hub/auth";
import { getQueueSnapshot, tryFormMatch } from "@/lib/hub/queue";
import { runTick } from "@/lib/hub/tick";
import { createSseStream } from "@/lib/hub/sse";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return new Response(
      JSON.stringify({ error: auth.error.kind }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = auth.user.id;

  return createSseStream({
    signal: req.signal,
    intervalMs: 1000,
    snapshot: async () => {
      // Каждый клиент пытается формировать матч / экспайрить просрочки.
      // tryFormMatch внутри использует SELECT FOR UPDATE SKIP LOCKED — гонок не будет.
      await runTick().catch(() => undefined);
      await tryFormMatch().catch(() => undefined);
      return getQueueSnapshot(userId);
    },
    isTerminal: (snap) => {
      // Если попал в ready-check или лобби — закрываем стрим,
      // клиент сам перейдёт на соответствующую страницу.
      if (snap.ticket?.status === "READY_CHECK" && snap.ticket.readyCheckId) return true;
      if (snap.lobbyId) return true;
      if (!snap.ticket) return true; // вышел из очереди
      return false;
    },
  });
}
