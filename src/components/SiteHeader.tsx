import Link from "next/link";
import { UserMenu } from "./UserMenu";

const navLinks = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/matches", label: "Матчи" },
  { href: "/teams", label: "Команды" },
  { href: "/players", label: "Игроки" },
  { href: "/news", label: "Новости" },
  { href: "/streams", label: "Стримы" },
];

export function SiteHeader() {
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
        <nav className="hidden md:flex gap-6 text-sm font-medium">
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
        <UserMenu />
      </div>
    </header>
  );
}

export function SiteFooter() {
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
          Built for the Kazakh esports community
        </span>
      </div>
    </footer>
  );
}
