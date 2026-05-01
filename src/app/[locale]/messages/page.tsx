export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export default async function MessagesIndexPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/steam");

  // Все диалоги в которых я участвую (через ChatMessage)
  // Для DM: имя диалога "DM:<a>:<b>"
  const myConversations = await prisma.conversation.findMany({
    where: {
      isGroup: false,
      OR: [
        { name: { startsWith: `DM:${me.id}:` } },
        { name: { contains: `:${me.id}` } },
      ],
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Извлекаем "другую сторону" из имени диалога
  const otherUserIds = new Set<string>();
  const dialogues = myConversations
    .map((c) => {
      if (!c.name) return null;
      const m = c.name.match(/^DM:([^:]+):([^:]+)$/);
      if (!m) return null;
      const otherId = m[1] === me.id ? m[2] : m[1];
      otherUserIds.add(otherId);
      return {
        conversationId: c.id,
        otherId,
        lastMessage: c.messages[0] ?? null,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const others = otherUserIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(otherUserIds) } },
        select: { id: true, username: true, avatarUrl: true, lastSeenAt: true },
      })
    : [];
  const otherMap = new Map(others.map((u) => [u.id, u]));

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Messages
          </p>
          <h1 className="text-4xl font-black tracking-tight">Сообщения</h1>
        </div>

        {dialogues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
            <div className="text-4xl mb-3">💬</div>
            <p className="font-bold mb-2 text-zinc-300">Диалогов пока нет</p>
            <p className="text-sm">
              Открой профиль игрока и нажми «Написать», чтобы начать переписку.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
            {dialogues.map((d) => {
              const other = otherMap.get(d.otherId);
              if (!other) return null;
              const isFromMe = d.lastMessage?.sender?.id === me.id;
              const preview = d.lastMessage?.body
                ? `${isFromMe ? "Ты: " : ""}${d.lastMessage.body.slice(0, 80)}`
                : "(нет сообщений)";
              return (
                <Link
                  key={d.conversationId}
                  href={`/messages/${other.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-zinc-800/30 transition-colors"
                >
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
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{other.username}</div>
                    <div className="text-xs text-zinc-500 truncate font-mono">
                      {preview}
                    </div>
                  </div>
                  {d.lastMessage && (
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {new Date(d.lastMessage.createdAt).toLocaleString(
                        "ru-RU",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
