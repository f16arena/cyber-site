import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { createParty } from "@/lib/hub/party";

export async function POST() {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }
  const res = await createParty(auth.user.id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true, partyId: res.partyId });
}
