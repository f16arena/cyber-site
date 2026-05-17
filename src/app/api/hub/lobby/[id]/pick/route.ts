import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { pickPlayer } from "@/lib/hub/lobby";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    pickedUserId?: unknown;
  };
  if (typeof body.pickedUserId !== "string") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await pickPlayer(id, auth.user.id, body.pickedUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    allPicked: result.allPicked,
    nextTurn: result.nextTurn,
  });
}
