import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import type { NotificationType } from "@prisma/client";

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  imageUrl?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      imageUrl: params.imageUrl ?? null,
    },
  });

  // Параллельно — push (если у юзера есть подписки и VAPID настроен)
  sendPushToUser(params.userId, {
    title: params.title,
    body: params.body,
    url: params.link,
    tag: params.type,
  }).catch(() => {});
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
