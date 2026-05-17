export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureSuperadminFromEnv } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";

type StartupError = {
  kind: "session" | "db" | "seed";
  message: string;
};

function diagnoseSessionError(message: string): string {
  if (/password/i.test(message) && /short|length|32/i.test(message)) {
    return "SESSION_SECRET короче 32 символов. На Vercel пропишите SESSION_SECRET длиной не меньше 32 (любая случайная строка).";
  }
  if (/password/i.test(message)) {
    return "SESSION_SECRET не задан. Добавьте на Vercel переменную SESSION_SECRET (32+ символов) и сделайте Redeploy.";
  }
  return message;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const startupErrors: StartupError[] = [];
  let session: Awaited<ReturnType<typeof getCurrentUser>> = null;

  // 1. Авто-создание суперадмина из env. Молча — поверх 500.
  try {
    await ensureSuperadminFromEnv();
  } catch (e) {
    startupErrors.push({
      kind: "seed",
      message: (e as Error).message,
    });
  }

  // 2. Сессия. iron-session жёстко падает при коротком SESSION_SECRET.
  try {
    session = await getCurrentUser();
  } catch (e) {
    startupErrors.push({
      kind: "session",
      message: diagnoseSessionError((e as Error).message),
    });
  }

  // 3. Проверка админа в БД (только если есть сессия и она читается)
  if (session?.id) {
    try {
      const u = await prisma.user.findUnique({
        where: { id: session.id },
        select: { isAdmin: true },
      });
      if (u?.isAdmin) {
        redirect(sp.to ?? "/admin");
      }
    } catch (e) {
      const msg = (e as Error).message;
      // NEXT_REDIRECT — не ошибка, его перекидываем выше
      if (msg.includes("NEXT_REDIRECT")) throw e;
      startupErrors.push({ kind: "db", message: msg });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-base clip-corner group-hover:scale-110 transition-transform">
              E
            </div>
            <span className="font-black text-2xl tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                ESPORTS
              </span>
              <span className="text-zinc-500 font-mono">.kz</span>
            </span>
          </Link>
          <div className="mt-4 text-[10px] font-mono uppercase tracking-widest text-amber-400">
            Superadmin
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">
            Вход для администратора
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            Отдельная учётка клиента, не связанная со Steam. Для обычных
            пользователей — вход через Steam с главной.
          </p>
        </div>

        {sp.error === "admin_required" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-4 text-sm text-amber-200">
            Эта страница требует прав администратора.
          </div>
        )}

        {startupErrors.length > 0 && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 mb-4 space-y-2">
            <div className="text-sm font-bold text-rose-200">
              Сайт не до конца настроен
            </div>
            {startupErrors.map((err, i) => (
              <div key={i} className="text-xs text-rose-100/90">
                <span className="font-mono uppercase tracking-widest text-rose-300">
                  [{err.kind}]
                </span>{" "}
                {err.message}
              </div>
            ))}
            <div className="text-[11px] text-rose-200/70 pt-1 border-t border-rose-500/30 mt-2">
              После исправления переменных в Vercel нажмите Redeploy.
            </div>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6">
          <AdminLoginForm to={sp.to} />
        </div>

        <div className="text-center mt-6 text-xs font-mono text-zinc-500">
          Не админ?{" "}
          <Link href="/" className="text-violet-400 hover:text-violet-300">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
