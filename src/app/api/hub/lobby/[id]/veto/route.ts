import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { applyVetoBan } from "@/lib/hub/veto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { map?: unknown };
  if (typeof body.map !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await applyVetoBan(id, auth.user.id, body.map);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    finished: result.finished,
    selectedMap: result.selectedMap,
    nextTurn: result.nextTurn,
  });
}
