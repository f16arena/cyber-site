export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { toggleAdmin } from "../actions";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default async function AdminUsersPage() {
  const me = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      _count: { select: { teamMemberships: true, mvpAwards: true } },
    },
  });

  return (
    <PageContainer maxWidth="default" className="py-6">
      <Link
        href="/admin"
        className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-3"
      >
        ← Админка
      </Link>
      <h1 className="text-xl font-bold tracking-tight mb-5">
        Игроки <span className="text-text-muted font-mono">· {users.length}</span>
      </h1>

      <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 px-3 py-2.5 hover:bg-bg-elevated transition-colors"
          >
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.avatarUrl}
                alt={u.username}
                className="w-9 h-9 border border-border-default"
              />
            ) : (
              <div className="w-9 h-9 bg-bg-elevated border border-border-default flex items-center justify-center text-sm font-bold text-text-secondary">
                {u.username[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/players/${encodeURIComponent(u.username)}`}
                  className="font-semibold text-text-primary hover:text-brand-yellow text-[13px]"
                >
                  {u.username}
                </Link>
                {u.isAdmin && (
                  <Badge variant="yellow" size="sm">
                    ADMIN
                  </Badge>
                )}
                {u.emailVerifiedAt && (
                  <Badge variant="win" size="sm">
                    email ✓
                  </Badge>
                )}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-0.5">
                Steam: {u.steamId} · Команд: {u._count.teamMemberships} · MVP:{" "}
                {u._count.mvpAwards}
              </div>
            </div>
            <span className="text-[10px] font-mono text-text-muted hidden sm:inline shrink-0">
              {new Date(u.createdAt).toLocaleDateString("ru-RU")}
            </span>
            {u.id !== me.id && (
              <form action={toggleAdmin}>
                <input type="hidden" name="userId" value={u.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant={u.isAdmin ? "ghost" : "secondary"}
                  className={u.isAdmin ? "text-rose-300 hover:text-rose-200" : ""}
                >
                  {u.isAdmin ? "Снять админа" : "Сделать админом"}
                </Button>
              </form>
            )}
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
