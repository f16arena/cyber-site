export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getOrCreateDirectConversation } from "../actions";
import { ChatWindow } from "./chat";

export default async function DirectMessagesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/steam");

  const { userId } = await params;
  if (userId === me.id) redirect("/messages");

  const other = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatarUrl: true, lastSeenAt: true },
  });
  if (!other) notFound();

  const conversationId = await getOrCreateDirectConversation(me.id, other.id);

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

  const isOnline =
    other.lastSeenAt && Date.now() - other.lastSeenAt.getTime() < 5 * 60 * 1000;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
        <Link
          href="/messages"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-4"
        >
          ← Все сообщения
        </Link>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
          <header className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-zinc-900/60">
            <div className="relative">
              {other.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={other.avatarUrl}
                  alt={other.username}
                  className="w-10 h-10 rounded border border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-violet-500/20" />
              )}
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/players/${other.username}`}
                className="font-bold hover:text-violet-200"
              >
                {other.username}
              </Link>
              <div className="text-[10px] font-mono text-zinc-500">
                {isOnline ? "online" : "offline"}
              </div>
            </div>
          </header>

          <ChatWindow
            myId={me.id}
            otherId={other.id}
            initialMessages={messages.map((m) => ({
              ...m,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
