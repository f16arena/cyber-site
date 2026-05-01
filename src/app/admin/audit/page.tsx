export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const ACTION_LABEL: Record<string, string> = {
  DELETE_TEAM: "🗑 Удалена команда",
  DELETE_SPONSOR: "🗑 Удалён спонсор",
  DELETE_NEWS: "🗑 Удалена новость",
  DELETE_WORLD_NEWS: "🗑 Удалена мировая новость",
  DELETE_TOURNAMENT: "🗑 Удалён турнир",
  EDIT_TEAM: "✎ Команда отредактирована",
  EDIT_SPONSOR: "✎ Спонсор отредактирован",
  EDIT_TOURNAMENT: "✎ Турнир отредактирован",
  GRANT_ADMIN: "👑 Выдано админство",
  REVOKE_ADMIN: "👑 Снято админство",
  CREATE_TOURNAMENT: "+ Создан турнир",
  GENERATE_BRACKET: "⚙ Сгенерирована сетка",
  SET_MATCH_RESULT: "⚔ Поставлен результат",
  AWARD_MVP: "⭐ Назначен MVP",
  MARK_INQUIRY_HANDLED: "✓ Заявка обработана",
};

export default async function AdminAuditPage() {
  await requireAdmin();

  const logs = await prisma.adminActionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const adminIds = [...new Set(logs.map((l) => l.adminId))];
  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, username: true },
  });
  const adminMap = new Map(admins.map((a) => [a.id, a.username]));

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-2xl font-display font-black tracking-tight">
          Журнал действий
        </h1>
        <Link
          href="/admin"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300"
        >
          ← Админка
        </Link>
      </div>
      <p className="text-zinc-400 text-sm mb-6">
        Что админы делали с критичными сущностями. Хранится навсегда — для
        безопасности и расследований.
      </p>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
          Журнал пуст. Действия начнут логироваться с этого коммита.
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
          {logs.map((l) => (
            <div key={l.id} className="p-4 text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold">
                  {ACTION_LABEL[l.action] || l.action}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {l.createdAt.toLocaleString("ru-RU")}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-500 mt-1">
                Админ: <span className="text-zinc-300">{adminMap.get(l.adminId) || l.adminId}</span>
                {l.entity && (
                  <>
                    {" · "}
                    {l.entity}
                    {l.entityId && (
                      <span className="text-zinc-600"> ({l.entityId.slice(0, 8)}...)</span>
                    )}
                  </>
                )}
              </div>
              {l.metadata !== null && (
                <pre className="text-[10px] font-mono text-zinc-500 mt-2 bg-zinc-950/40 rounded p-2 overflow-x-auto">
                  {JSON.stringify(l.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
