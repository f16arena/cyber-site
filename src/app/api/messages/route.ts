import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateDirectConversation, purgeOldMessages } from "@/lib/conversations";

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ messages: [] }, { status: 401 });

  const url = new URL(request.url);
  const otherId = url.searchParams.get("with");
  if (!otherId || otherId === me.id) {
    return NextResponse.json({ messages: [] });
  }

  const conversationId = await getOrCreateDirectConversation(me.id, otherId);
  await purgeOldMessages(conversationId);

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
