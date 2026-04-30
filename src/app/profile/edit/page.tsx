import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "@/components/UserMenu";
import { ProfileEditForm } from "./form";

const navLinks = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/matches", label: "Матчи" },
  { href: "/teams", label: "Команды" },
  { href: "/players", label: "Игроки" },
  { href: "/news", label: "Новости" },
  { href: "/streams", label: "Стримы" },
];

export default async function ProfileEditPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/api/auth/steam");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { profiles: true },
  });

  if (!user) redirect("/api/auth/steam");

  return (
    <>
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

      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link
          href="/profile"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Профиль
        </Link>

        <h1 className="text-3xl font-black tracking-tight mb-2">
          Редактирование профиля
        </h1>
        <p className="text-zinc-400 mb-8">
          Заполни данные, чтобы команды могли тебя найти.
        </p>

        <ProfileEditForm
          user={{
            username: user.username,
            bio: user.bio,
            region: user.region,
            twitchUrl: user.twitchUrl,
            discordTag: user.discordTag,
          }}
          profiles={user.profiles.map((p) => ({
            game: p.game,
            inGameRole: p.inGameRole,
            rank: p.rank,
          }))}
        />
      </main>
    </>
  );
}
