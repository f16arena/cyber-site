import { NextResponse } from "next/server";
import { getHubUser } from "@/lib/hub/auth";
import { leaveQueue } from "@/lib/hub/queue";

export async function POST() {
  const auth = await getHubUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error.kind }, { status: 401 });
  }

  const result = await leaveQueue(auth.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
