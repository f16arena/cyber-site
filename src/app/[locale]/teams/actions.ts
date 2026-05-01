"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { uploadImage, deleteImage } from "@/lib/storage";
import { notify } from "@/lib/notifications";
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
  const privacy = (formData.get("privacy") as string | null) === "PRIVATE" ? "PRIVATE" : "PUBLIC";

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
        privacy,
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
  const privacy = (formData.get("privacy") as string | null) === "PRIVATE" ? "PRIVATE" : "PUBLIC";

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
      privacy,
    },
  });

  revalidatePath(`/teams/${team.tag}`);
  redirect(`/teams/${team.tag}`);
}

export async function uploadTeamLogo(formData: FormData): Promise<TeamFormState> {
  "use server";
  const user = await getCurrentUser();
  if (!user) return { error: "Не авторизован" };

  const teamId = formData.get("teamId") as string | null;
  const file = formData.get("file") as File | null;
  if (!teamId || !file || file.size === 0) return { error: "Файл не выбран" };

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Команда не найдена" };
  if (team.captainId !== user.id) {
    return { error: "Только капитан может менять лого" };
  }

  const result = await uploadImage("team-logos", team.id, file);
  if (!result.ok) return { error: result.error };

  // Удаляем старое лого
  if (team.logoUrl) {
    await deleteImage("team-logos", team.logoUrl).catch(() => {});
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl: result.publicUrl },
  });

  revalidatePath(`/teams/${team.tag}`);
  return { ok: true };
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

  // Закрытая команда — создаём запрос на вступление
  if (team.privacy === "PRIVATE") {
    const message = ((formData.get("message") as string) || "").trim().slice(0, 300);
    await prisma.teamJoinRequest.upsert({
      where: { teamId_userId: { teamId, userId: user.id } },
      create: {
        teamId,
        userId: user.id,
        status: "PENDING",
        message: message || null,
      },
      update: { status: "PENDING", message: message || null, decidedAt: null },
    });
    await notify({
      userId: team.captainId,
      type: "TEAM_JOIN_REQUEST",
      title: `${user.username ?? "Игрок"} хочет вступить в ${team.name}`,
      body: message || undefined,
      link: `/teams/${team.tag}/edit`,
    });
    revalidatePath(`/teams/${team.tag}`);
    return;
  }

  // Открытая — сразу зачисляем
  await prisma.teamMember.create({
    data: { teamId, userId: user.id, role: "PLAYER" },
  });
  revalidatePath(`/teams/${team.tag}`);
  revalidatePath("/profile");
}

export async function approveJoinRequest(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) return;
  const requestId = formData.get("requestId") as string | null;
  if (!requestId) return;

  const req = await prisma.teamJoinRequest.findUnique({
    where: { id: requestId },
    include: { team: true, user: { select: { username: true } } },
  });
  if (!req || req.team.captainId !== user.id) return;
  if (req.status !== "PENDING") return;

  // Проверка что игрок ещё не в другой команде по этой игре
  const exists = await prisma.teamMember.findFirst({
    where: { userId: req.userId, team: { game: req.team.game } },
  });
  if (exists) {
    await prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED", decidedAt: new Date() },
    });
    return;
  }

  await prisma.$transaction([
    prisma.teamMember.create({
      data: { teamId: req.teamId, userId: req.userId, role: "PLAYER" },
    }),
    prisma.teamJoinRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", decidedAt: new Date() },
    }),
  ]);

  await notify({
    userId: req.userId,
    type: "TEAM_REQUEST_ACCEPTED",
    title: `Тебя приняли в команду ${req.team.name}`,
    link: `/teams/${req.team.tag}`,
  });

  revalidatePath(`/teams/${req.team.tag}/edit`);
  revalidatePath(`/teams/${req.team.tag}`);
}

export async function declineJoinRequest(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) return;
  const requestId = formData.get("requestId") as string | null;
  if (!requestId) return;

  const req = await prisma.teamJoinRequest.findUnique({
    where: { id: requestId },
    include: { team: true },
  });
  if (!req || req.team.captainId !== user.id) return;
  if (req.status !== "PENDING") return;

  await prisma.teamJoinRequest.update({
    where: { id: requestId },
    data: { status: "DECLINED", decidedAt: new Date() },
  });

  await notify({
    userId: req.userId,
    type: "TEAM_REQUEST_DECLINED",
    title: `Капитан отклонил твою заявку в ${req.team.name}`,
  });

  revalidatePath(`/teams/${req.team.tag}/edit`);
}
