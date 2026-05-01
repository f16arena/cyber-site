import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        db: "down",
        error: (e as Error).message,
        latencyMs: Date.now() - start,
        ts: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
