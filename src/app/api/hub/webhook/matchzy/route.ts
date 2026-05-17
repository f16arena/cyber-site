import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finishMatch, cancelMatch } from "@/lib/hub/match-result";

/**
 * Webhook от MatchZy / Get5 после завершения матча.
 *
 * Защита: заголовок `X-Hub-Secret` сверяется с env `HUB_MATCHZY_SECRET`.
 * Если env не задана — в production отказываем, в dev пропускаем (для теста).
 *
 * Ожидаемый формат тела (MatchZy OnSeriesResult, упрощённо):
 *   {
 *     "event": "series_end",
 *     "matchid": "<HubMatch.id>",
 *     "winner": { "team": "team1" | "team2" },
 *     "team1": { "score": number },
 *     "team2": { "score": number }
 *   }
 *
 * Также принимаем "series_cancel" для отмены.
 *
 * Идемпотентность — на уровне finishMatch (повторный вызов вернёт already_finished).
 */
export async function POST(req: Request) {
  const secret = process.env.HUB_MATCHZY_SECRET;
  const provided = req.headers.get("x-hub-secret");
  if (secret) {
    if (provided !== secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "secret_not_configured" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const payload = body as {
    event?: string;
    matchid?: string;
    winner?: { team?: string };
    team1?: { score?: number };
    team2?: { score?: number };
  };

  const matchId = payload.matchid;
  if (!matchId || typeof matchId !== "string") {
    return NextResponse.json({ error: "matchid_required" }, { status: 400 });
  }

  // Запись raw payload в audit для отладки
  await prisma.hubAuditEvent.create({
    data: {
      kind: "MATCHZY_WEBHOOK",
      payload: payload as unknown as object,
    },
  });

  if (payload.event === "series_cancel") {
    const res = await cancelMatch(matchId, "matchzy_cancel");
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (payload.event === "series_end" || payload.event === "map_end") {
    const winnerTeam = payload.winner?.team;
    const winner: "A" | "B" | null =
      winnerTeam === "team1" ? "A" : winnerTeam === "team2" ? "B" : null;
    const scoreA = Number(payload.team1?.score ?? 0);
    const scoreB = Number(payload.team2?.score ?? 0);

    if (winner === null) {
      return NextResponse.json(
        { error: "winner_required" },
        { status: 400 }
      );
    }

    const res = await finishMatch(matchId, scoreA, scoreB, winner);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
    return NextResponse.json({ ok: true, deltaA: res.deltaA, deltaB: res.deltaB });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
