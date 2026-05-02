import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserMenu } from "./UserMenu";
import { GlobalSearch } from "./GlobalSearch";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";

export async function SiteHeader() {
  const t = await getTranslations("Nav");

  const navLinks = [
    { href: "/tournaments", label: t("tournaments") },
    { href: "/matches", label: t("matches") },
    { href: "/teams", label: t("teams") },
    { href: "/players", label: t("players") },
    { href: "/leaderboard", label: t("leaderboard") },
    { href: "/news", label: t("news") },
    { href: "/world-news", label: t("worldNews") },
  ];

  return (
    <header className="border-b border-violet-500/10 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-sm clip-corner group-hover:scale-110 transition-transform">
            E
          </div>
          <span className="font-black text-lg tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              ESPORTS
            </span>
            <span className="text-zinc-500 font-mono">.kz</span>
          </span>
        </Link>
        <nav className="hidden lg:flex gap-5 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-zinc-400 hover:text-violet-300 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <GlobalSearch />
          <LanguageSwitcher />
          <UserMenu />
          <MobileMenu links={navLinks} />
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t border-violet-500/10 mt-auto bg-zinc-950/80">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400 mb-3">
              Платформа
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/tournaments" className="text-zinc-400 hover:text-violet-300">Турниры</Link></li>
              <li><Link href="/matches" className="text-zinc-400 hover:text-violet-300">Матчи</Link></li>
              <li><Link href="/teams" className="text-zinc-400 hover:text-violet-300">Команды</Link></li>
              <li><Link href="/players" className="text-zinc-400 hover:text-violet-300">Игроки</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400 mb-3">
              Сообщество
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/leaderboard" className="text-zinc-400 hover:text-violet-300">Лидерборды</Link></li>
              <li><Link href="/hall-of-fame" className="text-zinc-400 hover:text-violet-300">Зал славы</Link></li>
              <li><Link href="/compare" className="text-zinc-400 hover:text-violet-300">Сравнить игроков</Link></li>
              <li><Link href="/news" className="text-zinc-400 hover:text-violet-300">Новости</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400 mb-3">
              Партнёрам
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/sponsors" className="text-zinc-400 hover:text-violet-300">Для брендов</Link></li>
              <li><Link href="/stats" className="text-zinc-400 hover:text-violet-300">Открытая статистика</Link></li>
              <li><Link href="/world-news" className="text-zinc-400 hover:text-violet-300">Мировые новости</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400 mb-3">
              Аккаунт
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/profile" className="text-zinc-400 hover:text-violet-300">Профиль</Link></li>
              <li><Link href="/messages" className="text-zinc-400 hover:text-violet-300">Сообщения</Link></li>
              <li><Link href="/friends" className="text-zinc-400 hover:text-violet-300">Друзья</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-bold text-[10px]">
              E
            </div>
            <span className="font-mono">© 2026 ESPORTS.KZ</span>
          </div>
          <span className="font-mono uppercase tracking-wider">
            {t("tagline")}
          </span>
        </div>
      </div>
    </footer>
  );
}
