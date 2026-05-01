"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Game, Region } from "@prisma/client";

export type TeamFormState = {
  ok?: boolean;
  error?: string;
};

const VALID_GAMES: Game[] = ["CS2", "DOTA2", "PUBG"];
const VALID_REGIONS: Region[] = [
  "ALMATY", "ASTANA", "SHYMKENT", "KARAGANDA", "AKTAU", "AKTOBE",
  "PAVLODAR", "ATYRAU", "ORAL", "KOSTANAY", "TARAZ", "KZ_OTHER",
];

export async function createTeam(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Не авторизован" };

  const name = (formData.get("name") as string | null)?.trim() || "";
  const tag = (formData.get("tag") as string | null)?.trim().toUpperCase() || "";
  const game = formData.get("game") as string | null;
  const region = formData.get("region") as string | null;
  const description = ((formData.get("description") as string | null) || "").trim();

  if (name.length < 2 || name.length > 40) {
    return { error: "Название команды: 2–40 символов" };
  }
  if (!tag.match(/^[A-Z0-9]{2,5}$/)) {
    return { error: "Тег: 2–5 символов, только латиница и цифры" };
  }
  if (!game || !VALID_GAMES.includes(game as Game)) {
    return { error: "Выбери дисциплину" };
  }
  if (region && !VALID_REGIONS.includes(region as Region)) {
    return { error: "Неверный регион" };
  }
  if (description.length > 500) {
    return { error: "Описание не более 500 символов" };
  }

  // Капитан не может уже быть в другой команде по этой же игре
  const existingMembership = await prisma.teamMember.findFirst({
    where: { userId: user.id, team: { game: game as Game } },
  });
  if (existingMembership) {
    return { error: `Ты уже состоишь в команде по ${game}. Покинь её, чтобы создать новую.` };
  }

  // Тег уникален
  const tagConflict = await prisma.team.findUnique({ where: { tag } });
  if (tagConflict) return { error: "Этот тег уже занят" };

  try {
    const team = await prisma.team.create({
      data: {
        name,
        tag,
        game: game as Game,
        region: (region as Region) || null,
        description: description || null,
        captainId: user.id,
        members: {
          create: { userId: user.id, role: "CAPTAIN" },
        },
      },
    });
    revalidatePath("/teams");
    revalidatePath("/profile");
    redirect(`/teams/${team.tag}`);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { error: "Команда с таким именем для этой игры уже есть" };
    }
    throw e;
  }
}

export async function leaveTeam(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) return;
  const teamId = formData.get("teamId") as string | null;
  if (!teamId) return;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return;

  // Если уходит капитан — удаляем команду целиком (на MVP так проще)
  if (team.captainId === user.id) {
    await prisma.team.delete({ where: { id: teamId } });
  } else {
    await prisma.teamMember.deleteMany({
      where: { teamId, userId: user.id },
    });
  }
  revalidatePath("/profile");
  revalidatePath("/teams");
  redirect("/profile");
}

export async function updateTeam(
  _prev: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Не авторизован" };

  const teamId = formData.get("teamId") as string | null;
  if (!teamId) return { error: "teamId отсутствует" };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Команда не найдена" };
  if (team.captainId !== user.id) {
    return { error: "Только капитан может редактировать команду" };
  }

  const name = ((formData.get("name") as string | null) || "").trim();
  const description = ((formData.get("description") as string | null) || "").trim();
  const region = formData.get("region") as string | null;

  if (name.length < 2 || name.length > 40) {
    return { error: "Название команды: 2–40 символов" };
  }
  if (description.length > 500) {
    return { error: "Описание не более 500 символов" };
  }
  if (region && !VALID_REGIONS.includes(region as Region)) {
    return { error: "Неверный регион" };
  }

  await prisma.team.update({
    where: { id: teamId },
    data: {
      name,
      description: description || null,
      region: (region as Region) || null,
    },
  });

  revalidatePath(`/teams/${team.tag}`);
  redirect(`/teams/${team.tag}`);
}

export async function kickMember(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) return;
  const teamId = formData.get("teamId") as string | null;
  const memberId = formData.get("memberId") as string | null;
  if (!teamId || !memberId) return;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.captainId !== user.id) return;
  if (memberId === team.captainId) return; // капитан не может выгнать сам себя

  await prisma.teamMember.deleteMany({
    where: { teamId, userId: memberId },
  });

  revalidatePath(`/teams/${team.tag}`);
}

export async function joinTeam(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) return;
  const teamId = formData.get("teamId") as string | null;
  if (!teamId) return;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return;

  // Игрок может быть только в одной команде по дисциплине
  const exists = await prisma.teamMember.findFirst({
    where: { userId: user.id, team: { game: team.game } },
  });
  if (exists) return;

  await prisma.teamMember.create({
    data: { teamId, userId: user.id, role: "PLAYER" },
  });
  revalidatePath(`/teams/${team.tag}`);
  revalidatePath("/profile");
}
