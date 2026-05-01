export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { acceptFriend, declineFriend, removeFriend } from "./actions";

export default async function FriendsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/steam");

  // Все отношения где я участвую
  const all = await prisma.friendship.findMany({
    where: {
      OR: [{ fromId: me.id }, { toId: me.id }],
    },
    include: {
      from: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } },
      to: { select: { id: true, username: true, avatarUrl: true, lastSeenAt: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Разбиваем на категории
  const incomingPending = all.filter(
    (f) => f.status === "PENDING" && f.toId === me.id
  );
  const outgoingPending = all.filter(
    (f) => f.status === "PENDING" && f.fromId === me.id
  );
  const accepted = all.filter((f) => f.status === "ACCEPTED");

  const friendOf = (f: (typeof all)[number]) =>
    f.fromId === me.id ? f.to : f.from;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-4xl w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Friends
          </p>
          <h1 className="text-4xl font-black tracking-tight">Друзья</h1>
        </div>

        {incomingPending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
              Входящие запросы ({incomingPending.length})
            </h2>
            <div className="space-y-2">
              {incomingPending.map((f) => (
                <FriendRow
                  key={f.id}
                  friend={f.from}
                  actions={
                    <>
                      <form action={acceptFriend}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="text-xs font-mono px-3 h-8 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30"
                        >
                          ✓ Принять
                        </button>
                      </form>
                      <form action={declineFriend}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="text-xs font-mono px-3 h-8 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        >
                          ✗ Отклонить
                        </button>
                      </form>
                    </>
                  }
                />
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            В друзьях ({accepted.length})
          </h2>
          {accepted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              <p className="mb-2">Пока никого нет.</p>
              <p className="text-sm">
                Открой профиль игрока и нажми «Добавить в друзья».
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {accepted.map((f) => {
                const other = friendOf(f);
                return (
                  <FriendRow
                    key={f.id}
                    friend={other}
                    actions={
                      <>
                        <Link
                          href={`/messages/${other.id}`}
                          className="text-xs font-mono px-3 h-8 inline-flex items-center rounded border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5"
                        >
                          💬 Написать
                        </Link>
                        <form action={removeFriend}>
                          <input type="hidden" name="id" value={f.id} />
                          <button
                            type="submit"
                            className="text-xs font-mono px-3 h-8 rounded border border-zinc-700 hover:border-rose-500/50 hover:text-rose-300"
                            title="Удалить из друзей"
                          >
                            ✕
                          </button>
                        </form>
                      </>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        {outgoingPending.length > 0 && (
          <section>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">
              Исходящие запросы ({outgoingPending.length})
            </h2>
            <div className="space-y-2">
              {outgoingPending.map((f) => (
                <FriendRow
                  key={f.id}
                  friend={f.to}
                  faded
                  actions={
                    <form action={removeFriend}>
                      <input type="hidden" name="id" value={f.id} />
                      <button
                        type="submit"
                        className="text-xs font-mono px-3 h-8 rounded border border-zinc-700 hover:border-rose-500/50"
                      >
                        Отменить
                      </button>
                    </form>
                  }
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function FriendRow({
  friend,
  actions,
  faded = false,
}: {
  friend: {
    id: string;
    username: string;
    avatarUrl: string | null;
    lastSeenAt: Date | null;
  };
  actions: React.ReactNode;
  faded?: boolean;
}) {
  const isOnline =
    friend.lastSeenAt &&
    Date.now() - friend.lastSeenAt.getTime() < 5 * 60 * 1000;
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 ${faded ? "opacity-60" : ""}`}
    >
      <div className="relative shrink-0">
        {friend.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={friend.avatarUrl}
            alt={friend.username}
            className="w-10 h-10 rounded border border-zinc-700"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-violet-500/20" />
        )}
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-zinc-950" />
        )}
      </div>
      <Link
        href={`/players/${friend.username}`}
        className="flex-1 min-w-0 font-bold hover:text-violet-200"
      >
        {friend.username}
      </Link>
      <div className="flex gap-1.5">{actions}</div>
    </div>
  );
}
