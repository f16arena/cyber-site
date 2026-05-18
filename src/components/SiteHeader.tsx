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
    <header className="sticky top-0 z-20 border-b border-border-default bg-bg-base/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-12">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-cyan-500 flex items-center justify-center font-bold text-sm text-slate-950">
            F
          </div>
          <span className="font-bold text-base tracking-tight">
            <span className="text-text-primary">F16</span>
            <span className="text-cyan-400 ml-1">ARENA</span>
          </span>
        </Link>

        <nav className="hidden lg:flex gap-1 text-sm font-medium items-center ml-6 flex-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 h-12 inline-flex items-center text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
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
    <footer className="mt-auto border-t border-border-default bg-bg-base">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
          <FooterColumn title="Платформа">
            <FooterLink href="/tournaments">Турниры</FooterLink>
            <FooterLink href="/matches">Матчи</FooterLink>
            <FooterLink href="/teams">Команды</FooterLink>
            <FooterLink href="/players">Игроки</FooterLink>
          </FooterColumn>
          <FooterColumn title="Сообщество">
            <FooterLink href="/leaderboard">Лидерборды</FooterLink>
            <FooterLink href="/hall-of-fame">Зал славы</FooterLink>
            <FooterLink href="/compare">Сравнить игроков</FooterLink>
            <FooterLink href="/news">Новости</FooterLink>
          </FooterColumn>
          <FooterColumn title="Партнёрам">
            <FooterLink href="/sponsors">Для брендов</FooterLink>
            <FooterLink href="/stats">Открытая статистика</FooterLink>
            <FooterLink href="/world-news">Мировые новости</FooterLink>
          </FooterColumn>
          <FooterColumn title="Аккаунт">
            <FooterLink href="/profile">Профиль</FooterLink>
            <FooterLink href="/messages">Сообщения</FooterLink>
            <FooterLink href="/friends">Друзья</FooterLink>
          </FooterColumn>
        </div>
        <div className="pt-6 border-t border-border-default flex flex-col sm:flex-row justify-between gap-3 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-cyan-500 flex items-center justify-center font-bold text-[10px] text-slate-950">
              F
            </div>
            <span className="font-mono">© 2026 F16 ARENA</span>
          </div>
          <span className="font-mono uppercase tracking-wider">
            {t("tagline")}
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
        {title}
      </p>
      <ul className="space-y-1.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="text-text-secondary hover:text-cyan-300">
        {children}
      </Link>
    </li>
  );
}
