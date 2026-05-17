import Link from "next/link";
import { getLocale } from "next-intl/server";
import { UserMenu } from "@/components/UserMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function HubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-orange-500/15 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/hub`} className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center font-black text-xs">
                F
              </div>
              <span className="font-black text-base tracking-tight">
                <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
                  F16
                </span>
                <span className="text-zinc-400 font-mono ml-1">HUB</span>
              </span>
              <span className="ml-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
                CS2 · MM
              </span>
            </Link>
            <nav className="hidden md:flex gap-5 text-sm font-medium">
              <Link
                href={`/${locale}/hub`}
                className="text-zinc-400 hover:text-orange-300 transition-colors"
              >
                Дашборд
              </Link>
              <Link
                href={`/${locale}/hub/queue`}
                className="text-zinc-400 hover:text-orange-300 transition-colors"
              >
                Очередь
              </Link>
              <span
                className="text-zinc-600 cursor-not-allowed"
                title="Скоро — этап 7"
              >
                История
              </span>
              <Link
                href={`/${locale}`}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← На сайт
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-orange-500/10 bg-zinc-950/80 mt-auto">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>© 2026 F16 HUB · CS2 MATCHMAKING</span>
          <span className="uppercase tracking-wider">
            MVP · ETAPE 4
          </span>
        </div>
      </footer>
    </div>
  );
}
