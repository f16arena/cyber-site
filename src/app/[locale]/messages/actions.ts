"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateDirectConversation,
  getOrCreateTeamConversation,
} from "@/lib/conversations";
import { notify } from "@/lib/notifications";
import { emailNewMessage } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export { getOrCreateDirectConversation };

export async function sendTeamMessage(formData: FormData) {
  "use server";
  const me = await getCurrentUser();
  if (!me) return;

  // Анти-спам: 20 сообщений в минуту с одного юзера
  if (!rateLimit(`msg:${me.id}`, 20, 60_000).allowed) return;

  const teamId = formData.get("teamId") as string | null;
  const body = ((formData.get("body") as string) || "").trim();
  if (!teamId || !body || body.length > 2000) return;

  // Проверяем что я в команде
  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId: me.id },
    select: { id: true },
  });
  if (!member) return;

  const conversationId = await getOrCreateTeamConversation(teamId);
  await prisma.chatMessage.create({
    data: { conversationId, senderId: me.id, body },
  });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { tag: true },
  });
  if (team) {
    revalidatePath(`/teams/${team.tag}/chat`);
  }
}

export async function sendMessage(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;

  // Анти-спам: 20 сообщений в минуту от одного юзера
  if (!rateLimit(`msg:${me.id}`, 20, 60_000).allowed) return;

  const toUserId = formData.get("toUserId") as string | null;
  const body = ((formData.get("body") as string) || "").trim();

  if (!toUserId || !body || body.length > 2000) return;
  if (toUserId === me.id) return;

  const recipient = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true, messagePrivacy: true },
  });
  if (!recipient) return;

  // Проверка privacy: если получатель принимает только от друзей, проверим дружбу
  if (recipient.messagePrivacy === "FRIENDS_ONLY") {
    const areFriends = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { fromId: me.id, toId: toUserId },
          { fromId: toUserId, toId: me.id },
        ],
      },
      select: { id: true },
    });
    if (!areFriends) return; // тихо отбрасываем — UI потом покажет «недоступно»
  }

  const conversationId = await getOrCreateDirectConversation(me.id, toUserId);

  await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId: me.id,
      body,
    },
  });

  // Уведомляем получателя — но дедуплицируем: за последние 5 минут не плодим
  const recent = await prisma.notification.findFirst({
    where: {
      userId: toUserId,
      type: "NEW_MESSAGE",
      link: `/messages/${me.id}`,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    select: { id: true },
  });
  if (!recent) {
    await notify({
      userId: toUserId,
      type: "NEW_MESSAGE",
      title: `Новое сообщение от ${me.username ?? "игрока"}`,
      body: body.slice(0, 100),
      link: `/messages/${me.id}`,
    });
    const fullRecipient = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { email: true, emailNotifications: true },
    });
    if (fullRecipient?.email && fullRecipient.emailNotifications) {
      emailNewMessage(
        fullRecipient.email,
        me.username ?? "игрок",
        body.slice(0, 200)
      ).catch(() => {});
    }
  }

  revalidatePath(`/messages/${toUserId}`);
  revalidatePath("/messages");
}
