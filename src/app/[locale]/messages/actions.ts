"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateDirectConversation } from "@/lib/conversations";
import { notify } from "@/lib/notifications";

export { getOrCreateDirectConversation };

export async function sendMessage(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;

  const toUserId = formData.get("toUserId") as string | null;
  const body = ((formData.get("body") as string) || "").trim();

  if (!toUserId || !body || body.length > 2000) return;
  if (toUserId === me.id) return;

  const otherExists = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { id: true },
  });
  if (!otherExists) return;

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
  }

  revalidatePath(`/messages/${toUserId}`);
  revalidatePath("/messages");
}
