import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateTeamConversation, purgeOldMessages } from "@/lib/conversations";

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ messages: [] }, { status: 401 });

  const url = new URL(request.url);
  const teamId = url.searchParams.get("team");
  if (!teamId) return NextResponse.json({ messages: [] });

  // Проверяем что я в команде
  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId: me.id },
    select: { id: true },
  });
  if (!member) return NextResponse.json({ messages: [] }, { status: 403 });

  const conversationId = await getOrCreateTeamConversation(teamId);
  await purgeOldMessages(conversationId);

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
    })),
  });
}
