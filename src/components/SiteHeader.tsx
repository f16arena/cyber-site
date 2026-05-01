import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserMenu } from "./UserMenu";
import { GlobalSearch } from "./GlobalSearch";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function SiteHeader() {
  const t = await getTranslations("Nav");

  const navLinks = [
    { href: "/tournaments", label: t("tournaments") },
    { href: "/matches", label: t("matches") },
    { href: "/teams", label: t("teams") },
    { href: "/players", label: t("players") },
    { href: "/leaderboard", label: t("leaderboard") },
    { href: "/news", label: t("news") },
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
        <div className="flex items-center gap-3">
          <GlobalSearch />
          <LanguageSwitcher />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="border-t border-violet-500/10 mt-auto bg-zinc-950/80">
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-zinc-500 flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-xs">
            E
          </div>
          <span className="font-mono">© 2026 ESPORTS.KZ</span>
        </div>
        <span className="font-mono text-xs uppercase tracking-wider">
          {t("tagline")}
        </span>
      </div>
    </footer>
  );
}
