export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { getOrCreateTeamConversation } from "@/lib/conversations";
import { TeamChatWindow } from "./chat";

export default async function TeamChatPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).toUpperCase();

  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/steam");

  const team = await prisma.team.findUnique({
    where: { tag },
    include: {
      members: {
        select: {
          userId: true,
          user: { select: { username: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!team) notFound();

  const isMember = team.members.some((m) => m.userId === me.id);
  if (!isMember) redirect(`/teams/${team.tag}`);

  const conversationId = await getOrCreateTeamConversation(team.id);
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
        <Link
          href={`/teams/${team.tag}`}
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-4"
        >
          ← К команде
        </Link>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
          <header className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-zinc-900/60">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center font-black">
              {team.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">{team.name}</div>
              <div className="text-[10px] font-mono text-zinc-500">
                {team.members.length} участников · командный чат
              </div>
            </div>
          </header>

          <TeamChatWindow
            myId={me.id}
            teamId={team.id}
            initialMessages={messages.map((m) => ({
              id: m.id,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
              sender: {
                id: m.sender.id,
                username: m.sender.username,
                avatarUrl: m.sender.avatarUrl,
              },
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
