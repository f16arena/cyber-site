"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateDirectConversation } from "@/lib/conversations";

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

  revalidatePath(`/messages/${toUserId}`);
  revalidatePath("/messages");
}
