"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * Возвращает (или создаёт) приватный диалог между двумя пользователями.
 * Использует convention: имя у диалога формата "DM:<userIdA>:<userIdB>" где A < B.
 */
export async function getOrCreateDirectConversation(
  userAId: string,
  userBId: string
) {
  const [a, b] = [userAId, userBId].sort();
  const name = `DM:${a}:${b}`;

  let conv = await prisma.conversation.findFirst({
    where: { isGroup: false, name },
    select: { id: true },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { isGroup: false, name },
      select: { id: true },
    });
  }
  return conv.id;
}

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

  revalidatePath(`/messages/${toUserId}`);
  revalidatePath("/messages");
}
