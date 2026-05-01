"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

export async function sendFriendRequest(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const targetUsername = formData.get("username") as string | null;
  if (!targetUsername) return;

  const target = await prisma.user.findUnique({
    where: { username: targetUsername },
    select: { id: true },
  });
  if (!target || target.id === me.id) return;

  // Если уже есть какие-то отношения — не плодим дубли
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { fromId: me.id, toId: target.id },
        { fromId: target.id, toId: me.id },
      ],
    },
  });
  if (existing) return;

  await prisma.friendship.create({
    data: {
      fromId: me.id,
      toId: target.id,
      status: "PENDING",
    },
  });

  await notify({
    userId: target.id,
    type: "FRIEND_REQUEST",
    title: `${me.username ?? "Игрок"} хочет добавить тебя в друзья`,
    link: "/friends",
  });

  revalidatePath("/friends");
  revalidatePath(`/players/${targetUsername}`);
}

export async function acceptFriend(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const id = formData.get("id") as string | null;
  if (!id) return;

  const f = await prisma.friendship.findUnique({ where: { id } });
  if (!f || f.toId !== me.id) return;

  await prisma.friendship.update({
    where: { id },
    data: { status: "ACCEPTED" },
  });

  await notify({
    userId: f.fromId,
    type: "FRIEND_ACCEPTED",
    title: `${me.username ?? "Игрок"} принял твой запрос в друзья`,
    link: "/friends",
  });

  revalidatePath("/friends");
}

export async function declineFriend(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const id = formData.get("id") as string | null;
  if (!id) return;

  const f = await prisma.friendship.findUnique({ where: { id } });
  if (!f || (f.toId !== me.id && f.fromId !== me.id)) return;

  await prisma.friendship.delete({ where: { id } });
  revalidatePath("/friends");
}

export async function removeFriend(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const id = formData.get("id") as string | null;
  if (!id) return;

  const f = await prisma.friendship.findUnique({ where: { id } });
  if (!f || (f.toId !== me.id && f.fromId !== me.id)) return;

  await prisma.friendship.delete({ where: { id } });
  revalidatePath("/friends");
}
