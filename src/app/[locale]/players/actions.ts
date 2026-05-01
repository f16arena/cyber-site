"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Game, Region } from "@prisma/client";

export type LfgFormState = {
  ok?: boolean;
  error?: string;
};

const VALID_GAMES: Game[] = ["CS2", "DOTA2", "PUBG"];
const VALID_REGIONS: Region[] = [
  "ALMATY", "ASTANA", "SHYMKENT", "KARAGANDA", "AKTAU", "AKTOBE",
  "PAVLODAR", "ATYRAU", "ORAL", "KOSTANAY", "TARAZ", "KZ_OTHER",
];

export async function createLfgPost(
  _prev: LfgFormState,
  formData: FormData
): Promise<LfgFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Не авторизован" };

  const game = formData.get("game") as string | null;
  const description = ((formData.get("description") as string | null) || "").trim();
  const inGameRole = ((formData.get("inGameRole") as string | null) || "").trim();
  const region = formData.get("region") as string | null;

  if (!game || !VALID_GAMES.includes(game as Game)) {
    return { error: "Выбери дисциплину" };
  }
  if (description.length < 10 || description.length > 500) {
    return { error: "Описание: 10–500 символов" };
  }
  if (region && !VALID_REGIONS.includes(region as Region)) {
    return { error: "Неверный регион" };
  }

  // Деактивируем предыдущие посты той же дисциплины (один активный пост на игру)
  await prisma.lfgPost.updateMany({
    where: { authorId: user.id, game: game as Game, isActive: true },
    data: { isActive: false },
  });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14 дней

  await prisma.lfgPost.create({
    data: {
      authorId: user.id,
      game: game as Game,
      description,
      inGameRole: inGameRole || null,
      region: (region as Region) || null,
      expiresAt,
    },
  });

  revalidatePath("/players");
  redirect("/players");
}

export async function deactivateLfgPost(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) return;
  const id = formData.get("id") as string | null;
  if (!id) return;

  await prisma.lfgPost.updateMany({
    where: { id, authorId: user.id },
    data: { isActive: false },
  });

  revalidatePath("/players");
}
