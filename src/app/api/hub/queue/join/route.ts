import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { joinQueue, tryFormMatch } from "@/lib/hub/queue";

export async function POST() {
  const auth = await getHubUser();
  if (!auth.ok) {
    if (auth.error.kind === "unauthenticated") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (auth.error.kind === "banned") {
      return NextResponse.json(
        { error: "banned", until: auth.error.until.toISOString(), reason: auth.error.reason },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "cooldown", until: auth.error.until.toISOString() },
      { status: 403 }
    );
  }

  const result = await joinQueue(auth.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  // Сразу пробуем сформировать матч — низкая задержка для пользователя
  let readyCheckId: string | null = result.readyCheckId;
  if (!readyCheckId) {
    readyCheckId = await tryFormMatch().catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    ticketId: result.ticketId,
    readyCheckId,
  });
}
