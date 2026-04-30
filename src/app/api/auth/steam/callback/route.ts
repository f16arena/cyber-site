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
  const isAdminFromEnv = adminSteamIds.includes(steamId);

  // На create: isAdmin берём из env. На update: не сбрасываем — админство
  // могло быть выставлено вручную через /admin/users. Лишь повышаем если есть в env.
  const existing = await prisma.user.findUnique({
    where: { steamId },
    select: { isAdmin: true },
  });

  const user = await prisma.user.upsert({
    where: { steamId },
    create: {
      steamId,
      username: profile.personaName.slice(0, 32),
      avatarUrl: profile.avatarUrl,
      lastSeenAt: new Date(),
      isAdmin: isAdminFromEnv,
    },
    update: {
      avatarUrl: profile.avatarUrl,
      lastSeenAt: new Date(),
      // Если env даёт админство — повысим. Если нет — оставляем как было.
      ...(isAdminFromEnv && !existing?.isAdmin ? { isAdmin: true } : {}),
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
