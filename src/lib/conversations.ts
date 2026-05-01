import { prisma } from "./prisma";

/** Сообщения старше 24 часов удаляются автоматически (lazy). */
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

export async function purgeOldMessages(conversationId: string) {
  const cutoff = new Date(Date.now() - MESSAGE_TTL_MS);
  await prisma.chatMessage
    .deleteMany({
      where: {
        conversationId,
        createdAt: { lt: cutoff },
      },
    })
    .catch(() => {});
}

/** Глобальная очистка — для cron-job или manual cleanup. */
export async function purgeAllOldMessages() {
  const cutoff = new Date(Date.now() - MESSAGE_TTL_MS);
  return prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}

/**
 * Возвращает (или создаёт) приватный диалог между двумя пользователями.
 * Имя у диалога формата "DM:<userIdA>:<userIdB>" где A < B.
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

/**
 * Командный чат — групповой Conversation для каждой команды.
 * Имя в формате "TEAM:<teamId>".
 */
export async function getOrCreateTeamConversation(teamId: string) {
  const name = `TEAM:${teamId}`;
  let conv = await prisma.conversation.findFirst({
    where: { isGroup: true, name },
    select: { id: true },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { isGroup: true, name },
      select: { id: true },
    });
  }
  return conv.id;
}
