import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type HubUser = {
  id: string;
  steamId: string;
  username: string;
  avatarUrl: string | null;
  hubElo: number;
  hubWins: number;
  hubLosses: number;
  hubMatchesPlayed: number;
  hubBannedUntil: Date | null;
  hubCooldownUntil: Date | null;
  hubBanReason: string | null;
  isAdmin: boolean;
};

export type HubAuthError =
  | { kind: "unauthenticated" }
  | { kind: "banned"; until: Date; reason: string | null }
  | { kind: "cooldown"; until: Date };

export type HubAuthResult =
  | { ok: true; user: HubUser }
  | { ok: false; error: HubAuthError };

async function loadHubUser(userId: string): Promise<HubUser | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      steamId: true,
      username: true,
      avatarUrl: true,
      isAdmin: true,
      hubElo: true,
      hubWins: true,
      hubLosses: true,
      hubMatchesPlayed: true,
      hubBannedUntil: true,
      hubCooldownUntil: true,
      hubBanReason: true,
    },
  });
  return u;
}

/**
 * Возвращает пользователя hub без редиректов — для route handlers и server actions,
 * которые сами решают, как отвечать на ошибку (например, JSON-ответом).
 */
export async function getHubUser(): Promise<HubAuthResult> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { ok: false, error: { kind: "unauthenticated" } };

  const user = await loadHubUser(sessionUser.id);
  if (!user) return { ok: false, error: { kind: "unauthenticated" } };

  const now = new Date();
  if (user.hubBannedUntil && user.hubBannedUntil > now) {
    return {
      ok: false,
      error: { kind: "banned", until: user.hubBannedUntil, reason: user.hubBanReason },
    };
  }
  if (user.hubCooldownUntil && user.hubCooldownUntil > now) {
    return { ok: false, error: { kind: "cooldown", until: user.hubCooldownUntil } };
  }
  return { ok: true, user };
}

/**
 * Для серверных компонентов страниц: либо возвращает пользователя, либо редиректит
 * на Steam-логин. Для бана/cooldown — возвращает пользователя, страница сама решает,
 * как показать состояние (Find Match будет disabled).
 */
export async function requireHubUser(): Promise<HubUser> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/api/auth/steam");

  const user = await loadHubUser(sessionUser.id);
  if (!user) redirect("/api/auth/steam");

  return user;
}

/**
 * Текущий пользователь без редиректа (для шапки/гостевого UX).
 */
export async function getOptionalHubUser(): Promise<HubUser | null> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return null;
  return loadHubUser(sessionUser.id);
}
