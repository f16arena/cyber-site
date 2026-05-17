import { getHubUser } from "@/lib/hub/auth";
import { getReadyCheckSnapshot } from "@/lib/hub/ready-check";
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

  // Проверим, что пользователь — участник этого ready-check
  const participantCheck = await getReadyCheckSnapshot(id);
  if (!participantCheck) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const isParticipant = participantCheck.participants.some(
    (p) => p.userId === auth.user.id
  );
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
      const snap = await getReadyCheckSnapshot(id);
      return snap ?? { id, state: "FAILED", missing: true };
    },
    isTerminal: (snap) => {
      const s = snap as { state?: string };
      return s.state === "ACCEPTED" || s.state === "FAILED";
    },
  });
}
