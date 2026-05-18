import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser, getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NotificationsBell } from "./NotificationsBell";

export async function UserMenu() {
  const user = await getCurrentUser();
  const t = await getTranslations("Nav");

  if (!user) {
    const isDev = process.env.NODE_ENV !== "production";
    return (
      <div className="flex items-center gap-2">
        {isDev && (
          <Link
            href="/api/auth/_dev/login?username=dev_admin&to=/admin"
            title="Dev only — войти без Steam как admin"
            className="text-xs px-3 h-8 inline-flex items-center font-mono font-bold rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 whitespace-nowrap transition-colors"
          >
            DEV LOGIN
          </Link>
        )}
        <Link
          href="/api/auth/steam"
          className="text-sm px-4 h-8 inline-flex items-center font-bold uppercase tracking-wide rounded-sm bg-brand-yellow hover:bg-brand-yellow-hover text-text-on-yellow whitespace-nowrap transition-colors"
        >
          {t("loginSteam")}
        </Link>
      </div>
    );
  }

  const [pendingFriendRequests, unreadMessages, dbUser] = await Promise.all([
    prisma.friendship.count({
      where: { toId: user.id, status: "PENDING" },
    }),
    prisma.chatMessage.count({
      where: {
        readAt: null,
        senderId: { not: user.id },
        conversation: {
          isGroup: false,
          name: { contains: `:${user.id}` },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    }),
  ]);

  // Sync isAdmin in session if DB has it
  if (dbUser?.isAdmin && !user.isAdmin) {
    const session = await getSession();
    session.isAdmin = true;
    await session.save();
  }

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <NotificationsBell />
      <Link
        href="/friends"
        className="relative text-sm text-text-secondary hover:text-brand-yellow transition-colors px-2 h-8 inline-flex items-center"
        title="Друзья"
      >
        👥
        {pendingFriendRequests > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold bg-rose-500 text-white rounded-full px-1 py-0 min-w-[16px] text-center">
            {pendingFriendRequests}
          </span>
        )}
      </Link>
      <Link
        href="/messages"
        className="relative text-sm text-text-secondary hover:text-brand-yellow transition-colors px-2 h-8 inline-flex items-center"
        title="Сообщения"
      >
        💬
        {unreadMessages > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold bg-rose-500 text-white rounded-full px-1 py-0 min-w-[16px] text-center">
            {unreadMessages > 99 ? "99+" : unreadMessages}
          </span>
        )}
      </Link>
      {dbUser?.isAdmin && (
        <Link
          href="/admin"
          className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
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
            className="w-7 h-7 rounded border border-border-default group-hover:border-brand-yellow/60 transition-colors"
          />
        ) : (
          <div className="w-7 h-7 rounded bg-bg-elevated border border-border-default" />
        )}
        <span className="text-sm font-medium hidden lg:inline text-text-secondary group-hover:text-brand-yellow transition-colors">
          {user.username}
        </span>
      </Link>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="text-xs text-text-muted hover:text-rose-300 transition-colors px-1.5 h-8"
          title="Выйти"
        >
          ✕
        </button>
      </form>
    </div>
  );
}
