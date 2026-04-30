import { NextResponse } from "next/server";
import { verifySteamOpenId, fetchSteamProfile } from "@/lib/steam";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const steamId = await verifySteamOpenId(url.searchParams);

  if (!steamId) {
    return NextResponse.redirect(new URL("/?auth_error=invalid", url.origin));
  }

  const profile = await fetchSteamProfile(steamId);
  if (!profile) {
    return NextResponse.redirect(new URL("/?auth_error=profile", url.origin));
  }

  const adminSteamIds = (process.env.ADMIN_STEAM_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdmin = adminSteamIds.includes(steamId);

  // Создаём или обновляем пользователя в БД
  const user = await prisma.user.upsert({
    where: { steamId },
    create: {
      steamId,
      username: profile.personaName.slice(0, 32),
      avatarUrl: profile.avatarUrl,
      lastSeenAt: new Date(),
      isAdmin,
    },
    update: {
      avatarUrl: profile.avatarUrl,
      lastSeenAt: new Date(),
      isAdmin,
    },
  });

  // Записываем сессию
  const session = await getSession();
  session.userId = user.id;
  session.steamId = user.steamId;
  session.username = user.username;
  session.avatarUrl = user.avatarUrl ?? undefined;
  session.isAdmin = user.isAdmin;
  await session.save();

  return NextResponse.redirect(new URL("/profile", url.origin));
}
