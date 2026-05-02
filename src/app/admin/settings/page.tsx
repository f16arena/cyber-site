export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [adminCount, totalTables, dbTimestamp] = await Promise.all([
    prisma.user.count({ where: { isAdmin: true } }),
    16, // hard-coded — кол-во моделей в schema.prisma
    new Date().toISOString(),
  ]);

  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
      <h1 className="text-xl font-bold tracking-tight mb-6">Настройки</h1>

      <div className="space-y-6">
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Авторизация
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Метод</dt>
              <dd className="font-mono">Steam OpenID 2.0</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Сессии</dt>
              <dd className="font-mono">iron-session (cookie 30 дней)</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Админов в БД</dt>
              <dd className="font-mono text-amber-300">{adminCount}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            База данных
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Платформа</dt>
              <dd className="font-mono">Supabase Postgres</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">ORM</dt>
              <dd className="font-mono">Prisma 6</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Таблиц</dt>
              <dd className="font-mono">{totalTables}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Время сервера</dt>
              <dd className="font-mono text-xs">{dbTimestamp}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Интеграции
          </h2>
          <dl className="space-y-2 text-sm">
            <Row
              k="Steam Web API"
              v={process.env.STEAM_API_KEY ? "✓ настроено" : "✗ отсутствует"}
              ok={!!process.env.STEAM_API_KEY}
            />
            <Row
              k="FACEIT Data API"
              v={process.env.FACEIT_API_KEY ? "✓ настроено" : "не настроено"}
              ok={!!process.env.FACEIT_API_KEY}
            />
            <Row
              k="OpenDota API"
              v="не интегрирован"
              ok={false}
            />
            <Row
              k="PUBG Developer API"
              v="не интегрирован"
              ok={false}
            />
          </dl>
        </section>

        <section className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3">
            Как добавить администратора
          </h2>
          <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
            <li>
              Способ А: попроси игрока залогиниться через Steam, затем зайди в{" "}
              <span className="font-mono text-violet-300">/admin/users</span>{" "}
              и нажми &quot;Сделать админом&quot; рядом с его ником.
            </li>
            <li>
              Способ Б: добавь его Steam ID в env-переменную{" "}
              <code className="font-mono text-violet-300">ADMIN_STEAM_IDS</code>{" "}
              (через запятую). После следующего его логина админство применится
              автоматически.
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}

function Row({ k, v, ok }: { k: string; v: string; ok: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{k}</dt>
      <dd className={`font-mono ${ok ? "text-emerald-300" : "text-zinc-500"}`}>
        {v}
      </dd>
    </div>
  );
}
