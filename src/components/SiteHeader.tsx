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
    <header className="border-b border-border-default bg-bg-base">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 flex items-center justify-between h-10">
        <Link href="/" className="flex items-center gap-2 shrink-0 pr-4">
          <span className="font-bold text-[15px] tracking-tight uppercase">
            <span className="text-text-primary">F16</span>
            <span className="text-brand-yellow ml-0.5">ARENA</span>
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-text-muted hidden sm:inline">
            .kz
          </span>
        </Link>

        <nav className="hidden lg:flex text-[12px] items-center flex-1 ml-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-2.5 h-10 inline-flex items-center text-text-secondary uppercase tracking-wide font-medium hover:text-text-primary hover:bg-bg-panel"
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
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
          <FooterColumn title="Платформа">
            <FooterLink href="/tournaments">Турниры</FooterLink>
            <FooterLink href="/matches">Матчи</FooterLink>
            <FooterLink href="/teams">Команды</FooterLink>
            <FooterLink href="/players">Игроки</FooterLink>
          </FooterColumn>
          <FooterColumn title="Сообщество">
            <FooterLink href="/leaderboard">Лидерборды</FooterLink>
            <FooterLink href="/hall-of-fame">Зал славы</FooterLink>
            <FooterLink href="/compare">Сравнить</FooterLink>
            <FooterLink href="/news">Новости</FooterLink>
          </FooterColumn>
          <FooterColumn title="Партнёрам">
            <FooterLink href="/sponsors">Для брендов</FooterLink>
            <FooterLink href="/stats">Статистика</FooterLink>
            <FooterLink href="/world-news">Мировые новости</FooterLink>
          </FooterColumn>
          <FooterColumn title="Аккаунт">
            <FooterLink href="/profile">Профиль</FooterLink>
            <FooterLink href="/messages">Сообщения</FooterLink>
            <FooterLink href="/friends">Друзья</FooterLink>
          </FooterColumn>
        </div>
        <div className="pt-4 border-t border-border-default flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-text-muted">
          <div className="font-mono">© 2026 F16 ARENA</div>
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
      <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2.5">
        {title}
      </p>
      <ul className="space-y-1 text-[12px]">{children}</ul>
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
      <Link href={href} className="text-text-secondary hover:text-text-primary">
        {children}
      </Link>
    </li>
  );
}
