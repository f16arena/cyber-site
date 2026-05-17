import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export function isDevLoginAllowed(): boolean {
  // Локальный dev — всегда разрешено.
  if (process.env.NODE_ENV !== "production") return true;
  // Явное разрешение в production (включая Vercel preview) — флаг ALLOW_DEV_LOGIN.
  if (process.env.ALLOW_DEV_LOGIN === "true") return true;
  return false;
}

/**
 * DEV-ONLY вход без Steam.
 *
 * Доступен когда:
 *   - NODE_ENV !== "production" (локальный dev), либо
 *   - ALLOW_DEV_LOGIN === "true" (явное включение, например на Vercel preview).
 *
 * Если ALLOW_DEV_LOGIN включён, **обязательно** задайте DEV_LOGIN_TOKEN —
 * без него endpoint в production-окружении вернёт 503, чтобы не дать всем
 * залогиниться админами одной ссылкой.
 *
 * Параметры:
 *  - token:    обязателен если задан DEV_LOGIN_TOKEN
 *  - username: имя нового/существующего пользователя (default: dev_admin)
 *  - admin:    "0" чтобы НЕ выдавать isAdmin (default: выдаётся)
 *  - to:       куда редирект после логина (default: /admin)
 */
export async function GET(request: Request) {
  if (!isDevLoginAllowed()) {
    return NextResponse.json(
      { error: "disabled_in_production" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const expected = process.env.DEV_LOGIN_TOKEN;

  // В production-окружении (включая preview через ALLOW_DEV_LOGIN) токен обязателен.
  if (process.env.NODE_ENV === "production" && !expected) {
    return NextResponse.json(
      {
        error: "token_required_in_production",
        hint: "Set DEV_LOGIN_TOKEN env to a long random string",
      },
      { status: 503 }
    );
  }

  // Если токен задан в env — требуем его всегда.
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
