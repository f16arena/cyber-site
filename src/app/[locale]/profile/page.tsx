export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "@/components/UserMenu";

const navLinks = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/matches", label: "Матчи" },
  { href: "/teams", label: "Команды" },
  { href: "/players", label: "Игроки" },
  { href: "/news", label: "Новости" },
  { href: "/streams", label: "Стримы" },
];

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/api/auth/steam");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      profiles: true,
      teamMemberships: {
        include: { team: true },
      },
      mvpAwards: {
        include: { tournament: true },
      },
    },
  });

  if (!user) {
    redirect("/api/auth/steam");
  }

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

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
        <Link
          href="/"
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← Главная
        </Link>

        {/* Profile header */}
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-8 mb-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-24 h-24 rounded-lg border border-violet-500/30"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-violet-500/20 border border-violet-500/30" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black tracking-tight">
                  {user.username}
                </h1>
                {user.isAdmin && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    ADMIN
                  </span>
                )}
              </div>
              <div className="text-sm text-zinc-500 font-mono mt-1">
                Steam ID: {user.steamId}
              </div>
              {user.bio && (
                <p className="text-zinc-300 mt-4 leading-relaxed">{user.bio}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
                {user.region && (
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                    📍 {user.region}
                  </span>
                )}
                <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                  Зарегистрирован{" "}
                  {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
            </div>
            <Link
              href="/profile/edit"
              className="text-xs font-mono px-4 h-9 inline-flex items-center rounded border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5 transition-all"
            >
              Редактировать
            </Link>
          </div>
        </div>

        {/* Game profiles */}
        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Игровые профили
          </h2>
          {user.profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
              <p className="mb-3">Ты ещё не добавил ни одной игры в профиль.</p>
              <Link
                href="/profile/edit"
                className="text-violet-300 hover:text-violet-200 text-sm font-mono"
              >
                Добавить игру →
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {user.profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <div className="font-mono text-xs text-violet-400 uppercase">
                    {profile.game}
                  </div>
                  {profile.inGameRole && (
                    <div className="text-sm font-bold mt-1">
                      {profile.inGameRole}
                    </div>
                  )}
                  {profile.rank && (
                    <div className="text-xs text-zinc-500 mt-1">
                      Ранг: {profile.rank}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Teams */}
        <section className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Команды
          </h2>
          {user.teamMemberships.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
              <p className="mb-3">Ты ещё не в команде.</p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/teams/new"
                  className="text-violet-300 hover:text-violet-200 text-sm font-mono"
                >
                  Создать команду →
                </Link>
                <Link
                  href="/teams"
                  className="text-violet-300 hover:text-violet-200 text-sm font-mono"
                >
                  Найти команду →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {user.teamMemberships.map((m) => (
                <Link
                  key={m.id}
                  href={`/teams/${m.team.tag}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 transition-colors p-4"
                >
                  <div>
                    <div className="font-bold">{m.team.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {m.team.game} · {m.role}
                    </div>
                  </div>
                  <span className="text-zinc-500 text-xs font-mono">
                    [{m.team.tag}]
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* MVP Awards */}
        {user.mvpAwards.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-3">
              🏆 MVP-награды
            </h2>
            <div className="space-y-2">
              {user.mvpAwards.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
                >
                  <div className="font-bold">
                    {a.tournament?.name || "Match MVP"}
                  </div>
                  {a.comment && (
                    <p className="text-sm text-zinc-400 mt-1">{a.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-violet-500/10 mt-auto bg-zinc-950/80">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-zinc-500 flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-xs">
              E
            </div>
            <span className="font-mono">© 2026 ESPORTS.KZ</span>
          </div>
        </div>
      </footer>
    </>
  );
}
