import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { respondInvite } from "@/lib/hub/party";

export async function POST(req: Request) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    inviteId?: unknown;
    accept?: unknown;
  };
  if (typeof body.inviteId !== "string" || typeof body.accept !== "boolean") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const res = await respondInvite(auth.user.id, body.inviteId, body.accept);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true, joined: res.joined });
}
