import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { inviteToParty } from "@/lib/hub/party";

export async function POST(req: Request) {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { identifier?: unknown };
  if (typeof body.identifier !== "string" || body.identifier.trim().length < 2) {
    return NextResponse.json({ error: "identifier_required" }, { status: 400 });
  }
  const res = await inviteToParty(auth.user.id, body.identifier.trim());
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
