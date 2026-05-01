"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Badges = {
  pendingMatches: number;
  openInquiries: number;
  draftTournaments: number;
};

type SidebarItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  group?: string;
};

export function AdminSidebar({
  adminName,
  badges,
}: {
  adminName: string;
  badges: Badges;
}) {
  const pathname = usePathname();

  const sections: Array<{ title: string; items: SidebarItem[] }> = [
    {
      title: "Общее",
      items: [
        { href: "/admin", label: "Дашборд", icon: "▤" },
      ],
    },
    {
      title: "Турниры",
      items: [
        {
          href: "/admin/tournaments",
          label: "Все турниры",
          icon: "🏆",
          badge: badges.draftTournaments || undefined,
        },
        { href: "/admin/tournaments/new", label: "Создать", icon: "+" },
        {
          href: "/admin/matches",
          label: "Матчи",
          icon: "⚔",
          badge: badges.pendingMatches || undefined,
        },
        { href: "/admin/seasons", label: "Сезоны", icon: "📅" },
      ],
    },
    {
      title: "Сообщество",
      items: [
        { href: "/admin/users", label: "Игроки", icon: "👥" },
        { href: "/admin/teams", label: "Команды", icon: "🛡" },
        { href: "/admin/leaderboards", label: "Лидерборды", icon: "★" },
      ],
    },
    {
      title: "Контент",
      items: [
        { href: "/admin/news", label: "Новости", icon: "📰" },
        { href: "/admin/news/new", label: "Создать новость", icon: "+" },
        { href: "/admin/world-news", label: "Мировые новости", icon: "🌍" },
        { href: "/admin/world-news/new", label: "Добавить мировую", icon: "+" },
      ],
    },
    {
      title: "Партнёры",
      items: [
        { href: "/admin/sponsors", label: "Спонсоры", icon: "💎" },
        {
          href: "/admin/inquiries",
          label: "Заявки",
          icon: "📩",
          badge: badges.openInquiries || undefined,
        },
      ],
    },
    {
      title: "Настройки",
      items: [
        { href: "/admin/settings", label: "Настройки", icon: "⚙" },
      ],
    },
  ];

  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-zinc-800/60 bg-zinc-950/40 min-h-[calc(100vh-3.5rem)]">
      <div className="sticky top-14 p-4">
        <div className="mb-4 px-2 pb-3 border-b border-zinc-800/60">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Авторизован как
          </div>
          <div className="text-sm font-bold mt-0.5">{adminName}</div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="mb-5">
            <div className="px-2 mb-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-600">
              {section.title}
            </div>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded text-sm transition-colors ${
                      isActive
                        ? "bg-violet-500/15 text-violet-200 border border-violet-500/30"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-zinc-500 w-4 text-center">
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge ? (
                      <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
