import { prisma } from "./prisma";

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
