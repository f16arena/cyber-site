import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { respondReady } from "@/lib/hub/ready-check";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { accept?: unknown };
  if (typeof body.accept !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await respondReady(id, auth.user.id, body.accept);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true, finalized: result.finalized });
}
