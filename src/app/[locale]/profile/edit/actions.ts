"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { uploadImage, deleteImage } from "@/lib/storage";
import type { Game, Region } from "@prisma/client";

export type ProfileFormState = {
  ok?: boolean;
  error?: string;
};

const VALID_GAMES: Game[] = ["CS2", "DOTA2", "PUBG"];
const VALID_REGIONS: Region[] = [
  "ALMATY", "ASTANA", "SHYMKENT", "KARAGANDA", "AKTAU", "AKTOBE",
  "PAVLODAR", "ATYRAU", "ORAL", "KOSTANAY", "TARAZ", "KZ_OTHER",
];

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Не авторизован" };

  const usernameRaw = formData.get("username");
  const bioRaw = formData.get("bio");
  const regionRaw = formData.get("region");
  const twitchRaw = formData.get("twitchUrl");
  const discordRaw = formData.get("discordTag");

  const username = typeof usernameRaw === "string" ? usernameRaw.trim() : "";
  const bio = typeof bioRaw === "string" ? bioRaw.trim() : "";
  const region = typeof regionRaw === "string" ? regionRaw : "";
  const twitchUrl = typeof twitchRaw === "string" ? twitchRaw.trim() : "";
  const discordTag = typeof discordRaw === "string" ? discordRaw.trim() : "";
  const messagePrivacy =
    formData.get("messagePrivacy") === "FRIENDS_ONLY" ? "FRIENDS_ONLY" : "EVERYONE";

  if (username.length < 2 || username.length > 32) {
    return { error: "Ник должен быть от 2 до 32 символов" };
  }
  if (bio.length > 500) {
    return { error: "Био не должно превышать 500 символов" };
  }
  if (twitchUrl && !twitchUrl.match(/^https?:\/\/(www\.)?twitch\.tv\/[\w-]+$/)) {
    return { error: "Неверная ссылка на Twitch" };
  }
  if (region && !VALID_REGIONS.includes(region as Region)) {
    return { error: "Неверный регион" };
  }

  // Если ник занят другим юзером — отказ
  const conflict = await prisma.user.findFirst({
    where: { username, NOT: { id: user.id } },
    select: { id: true },
  });
  if (conflict) return { error: "Этот ник уже занят" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      username,
      bio: bio || null,
      region: (region as Region) || null,
      twitchUrl: twitchUrl || null,
      discordTag: discordTag || null,
      messagePrivacy,
    },
  });

  // Обновим сессию username чтобы UserMenu сразу показал новый
  const session = await getSession();
  session.username = username;
  await session.save();

  // Обновляем дисциплины
  const games = formData.getAll("games").filter(
    (v): v is string => typeof v === "string" && VALID_GAMES.includes(v as Game)
  );

  // Удаляем профили дисциплин, которых нет в новом списке
  await prisma.playerProfile.deleteMany({
    where: { userId: user.id, NOT: { game: { in: games as Game[] } } },
  });

  // Для каждой выбранной дисциплины — обновляем или создаём
  for (const game of games) {
    const role = (formData.get(`role_${game}`) as string | null)?.trim() || null;
    const rank = (formData.get(`rank_${game}`) as string | null)?.trim() || null;
    await prisma.playerProfile.upsert({
      where: { userId_game: { userId: user.id, game: game as Game } },
      create: { userId: user.id, game: game as Game, inGameRole: role, rank },
      update: { inGameRole: role, rank },
    });
  }

  revalidatePath("/profile");
  redirect("/profile");
}

export async function uploadAvatar(formData: FormData): Promise<ProfileFormState> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { error: "Не авторизован" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Файл не выбран" };

  const result = await uploadImage("user-avatars", user.id, file);
  if (!result.ok) return { error: result.error };

  // Удаляем старый аватар (если он был с нашего стораджа, а не из Steam)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  });
  if (dbUser?.avatarUrl?.includes("/storage/v1/object/public/user-avatars/")) {
    await deleteImage("user-avatars", dbUser.avatarUrl).catch(() => {});
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: result.publicUrl },
  });

  // Обновим сессию чтобы UserMenu сразу показал новый
  const session = await getSession();
  session.avatarUrl = result.publicUrl;
  await session.save();

  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  return { ok: true };
}

export async function resetAvatarToSteam(): Promise<ProfileFormState> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { error: "Не авторизован" };

  // Подтянем аватар из Steam Web API
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) return { error: "Steam API недоступен" };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { steamId: true, avatarUrl: true },
  });
  if (!dbUser) return { error: "Пользователь не найден" };

  try {
    const resp = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${dbUser.steamId}`,
      { cache: "no-store" }
    );
    if (!resp.ok) return { error: "Не удалось получить аватар Steam" };
    const data = (await resp.json()) as {
      response: { players: Array<{ avatarfull: string }> };
    };
    const avatarUrl = data.response.players[0]?.avatarfull;
    if (!avatarUrl) return { error: "В Steam нет аватара" };

    // Удалим текущий из storage если он там
    if (dbUser.avatarUrl?.includes("/storage/v1/object/public/user-avatars/")) {
      await deleteImage("user-avatars", dbUser.avatarUrl).catch(() => {});
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    const session = await getSession();
    session.avatarUrl = avatarUrl;
    await session.save();

    revalidatePath("/profile");
    revalidatePath("/profile/edit");
    return { ok: true };
  } catch (e) {
    return { error: `Ошибка: ${(e as Error).message}` };
  }
}
