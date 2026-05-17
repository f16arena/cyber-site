import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * DEV-ONLY вход без Steam. Полностью отключён в production.
 *
 * Защита: NODE_ENV !== "production". Этого достаточно, потому что dev-сервер
 * слушает на localhost и не виден снаружи.
 *
 * Опционально: если задан env DEV_LOGIN_TOKEN — он также проверяется (можно
 * пускать кого-то на свою dev-машину по сети безопасно).
 *
 * Параметры:
 *  - username: имя нового/существующего пользователя (default: dev_admin)
 *  - admin:    "0" чтобы НЕ выдавать isAdmin (default: выдаётся)
 *  - to:       куда редирект после логина (default: /admin)
 *
 * Использование:
 *   http://localhost:3000/api/auth/_dev/login
 *   http://localhost:3000/api/auth/_dev/login?username=tester&admin=0&to=/ru/hub
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "disabled_in_production" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);

  // Опциональная защита: если токен задан в env, требуем его в query.
  const expected = process.env.DEV_LOGIN_TOKEN;
  if (expected) {
    const provided = url.searchParams.get("token");
    if (provided !== expected) {
      return NextResponse.json({ error: "invalid_token" }, { status: 403 });
    }
  }

  const usernameRaw = (url.searchParams.get("username") ?? "dev_admin").trim();
  const username =
    usernameRaw.length >= 2 && /^[\w\-.]+$/.test(usernameRaw)
      ? usernameRaw
      : "dev_admin";
  const isAdmin = url.searchParams.get("admin") !== "0";
  const to = url.searchParams.get("to") || "/admin";

  // Используем префикс "dev_" в steamId, чтобы не конфликтовать с настоящими SteamID64.
  // Это же позволяет бот-логике (steamId.startsWith("bot_")) их игнорить.
  const steamId = `dev_${username}`;

  const user = await prisma.user.upsert({
    where: { steamId },
    create: {
      steamId,
      username,
      isAdmin,
      lastSeenAt: new Date(),
    },
    update: {
      lastSeenAt: new Date(),
      ...(isAdmin ? { isAdmin: true } : {}),
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.steamId = user.steamId;
  session.username = user.username;
  session.avatarUrl = user.avatarUrl ?? undefined;
  session.isAdmin = user.isAdmin;
  await session.save();

  return NextResponse.redirect(new URL(to, url.origin));
}
