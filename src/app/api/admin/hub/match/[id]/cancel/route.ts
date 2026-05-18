import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { cancelMatch } from "@/lib/hub/match-result";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await isAdmin();
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const res = await cancelMatch(id, "admin_cancel");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
