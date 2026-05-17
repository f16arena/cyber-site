export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureSuperadminFromEnv } from "@/lib/admin-auth";
import { AdminLoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; error?: string }>;
}) {
  const sp = await searchParams;

  // Авто-создание суперадмина из env (SUPERADMIN_LOGIN/PASSWORD).
  // Идемпотентно — на каждом запросе только проверка existence.
  await ensureSuperadminFromEnv().catch(() => undefined);

  // Если уже залогинен админом — сразу в админку.
  const session = await getCurrentUser();
  if (session?.id) {
    const u = await prisma.user.findUnique({
      where: { id: session.id },
      select: { isAdmin: true },
    });
    if (u?.isAdmin) {
      redirect(sp.to ?? "/admin");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-6">
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
