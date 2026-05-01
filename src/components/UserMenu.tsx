import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function UserMenu() {
  const user = await getCurrentUser();
  const t = await getTranslations("Nav");

  if (!user) {
    return (
      <Link
        href="/api/auth/steam"
        className="text-sm px-4 h-9 inline-flex items-center font-medium rounded border border-violet-500/30 hover:border-violet-400 hover:bg-violet-500/10 transition-all whitespace-nowrap"
      >
        {t("loginSteam")}
      </Link>
    );
  }

  // Бейджи: входящие friend requests, проверим isAdmin из БД
  const [pendingFriendRequests, dbUser] = await Promise.all([
    prisma.friendship.count({
      where: { toId: user.id, status: "PENDING" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    }),
  ]);

  // Синкаем isAdmin в сессию если в БД повысили
  if (dbUser?.isAdmin && !user.isAdmin) {
    const session = await getSession();
    session.isAdmin = true;
    await session.save();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/friends"
        className="relative text-sm font-mono text-zinc-400 hover:text-violet-300 transition-colors px-2"
        title="Друзья"
      >
        👥
        {pendingFriendRequests > 0 && (
          <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-rose-500 text-white rounded-full px-1.5 py-0.5">
            {pendingFriendRequests}
          </span>
        )}
      </Link>
      <Link
        href="/messages"
        className="text-sm font-mono text-zinc-400 hover:text-violet-300 transition-colors px-2"
        title="Сообщения"
      >
        💬
      </Link>
      {dbUser?.isAdmin && (
        <Link
          href="/admin"
          className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
          title="Админка"
        >
          ADMIN
        </Link>
      )}
      <Link href="/profile" className="flex items-center gap-2 group">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.username || "avatar"}
            className="w-8 h-8 rounded border border-violet-500/30 group-hover:border-violet-400 transition-colors"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-violet-500/20 border border-violet-500/30" />
        )}
        <span className="text-sm font-medium hidden lg:inline group-hover:text-violet-300 transition-colors">
          {user.username}
        </span>
      </Link>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="text-xs font-mono text-zinc-500 hover:text-rose-300 transition-colors px-1"
          title="Выйти"
        >
          ✕
        </button>
      </form>
    </div>
  );
}
