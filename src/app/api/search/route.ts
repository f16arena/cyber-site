import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ players: [], teams: [], tournaments: [] });
  }

  const [players, teams, tournaments] = await Promise.all([
    prisma.user.findMany({
      where: { username: { contains: q, mode: "insensitive" } },
      select: { username: true, avatarUrl: true },
      take: 5,
    }),
    prisma.team.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tag: { contains: q.toUpperCase() } },
        ],
      },
      select: { name: true, tag: true, game: true },
      take: 5,
    }),
    prisma.tournament.findMany({
      where: {
        name: { contains: q, mode: "insensitive" },
        status: { not: "DRAFT" },
      },
      select: { name: true, slug: true, game: true, status: true },
      take: 5,
    }),
  ]);

  return NextResponse.json({ players, teams, tournaments });
}
