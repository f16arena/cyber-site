import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { finishMatch } from "@/lib/hub/match-result";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    scoreA?: unknown;
    scoreB?: unknown;
    winner?: unknown;
  };
  const scoreA = Number(body.scoreA);
  const scoreB = Number(body.scoreB);
  const winner = body.winner === "A" || body.winner === "B" ? body.winner : null;
  if (winner === null) {
    return NextResponse.json({ error: "winner_required" }, { status: 400 });
  }
  const res = await finishMatch(id, scoreA, scoreB, winner);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true, deltaA: res.deltaA, deltaB: res.deltaB });
}
