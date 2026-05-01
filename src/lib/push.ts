import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;

function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:noreply@esports.kz";
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body?: string;
  icon?: string;
  url?: string;
  tag?: string;
};

/**
 * Отправляет push-уведомление пользователю на все его подписки.
 * Молча пропускает если VAPID не настроен.
 * Удаляет подписки которые вернули 410 Gone (expired).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<number> {
  configure();
  if (!configured) return 0;

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subs.length === 0) return 0;

  const json = JSON.stringify(payload);
  let sentCount = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json
        );
        sentCount++;
        await prisma.pushSubscription.update({
          where: { id: s.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (e) {
        const err = e as { statusCode?: number };
        // 410 Gone, 404 Not Found — подписка expired, удаляем
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription
            .delete({ where: { id: s.id } })
            .catch(() => {});
        }
      }
    })
  );

  return sentCount;
}
