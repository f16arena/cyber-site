export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { TeamEditForm } from "./form";
import { kickMember } from "../../actions";

export default async function TeamEditPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).toUpperCase();

  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/steam");

  const team = await prisma.team.findUnique({
    where: { tag },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!team) notFound();
  if (team.captainId !== me.id) redirect(`/teams/${tag}`);

  const inviteUrl = `${process.env.SITE_URL || "http://localhost:3000"}/teams/${team.tag}`;

  return (
    <>
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
        <Link
          href={`/teams/${team.tag}`}
          className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
        >
          ← К команде
        </Link>

        <h1 className="text-3xl font-black tracking-tight mb-2">
          Редактирование команды
        </h1>
        <p className="text-zinc-400 mb-8 text-sm">
          {team.name} <span className="font-mono text-zinc-500">[{team.tag}]</span> · {team.game}
        </p>

        <section className="mb-8">
          <TeamEditForm team={team} />
        </section>

        {/* Invite link */}
        <section className="rounded-lg border border-violet-500/20 bg-zinc-900/40 p-5 mb-8">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Пригласить игрока
          </h2>
          <p className="text-sm text-zinc-400 mb-3">
            Скинь эту ссылку — игрок откроет страницу команды и нажмёт
            «Вступить». Он должен играть в {team.game} и не быть в другой команде по этой игре.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded h-10 px-3 text-sm font-mono"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        </section>

        {/* Members management */}
        <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Состав ({team.members.length})
          </h2>
          <div className="space-y-2">
            {team.members.map((m) => {
              const isCaptain = m.userId === team.captainId;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded border border-zinc-800 bg-zinc-950/40"
                >
                  {m.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.user.avatarUrl}
                      alt={m.user.username}
                      className="w-8 h-8 rounded border border-zinc-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-violet-500/20" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{m.user.username}</div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {m.role}
                    </div>
                  </div>
                  {!isCaptain && (
                    <form action={kickMember}>
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="memberId" value={m.userId} />
                      <button
                        type="submit"
                        className="text-xs font-mono px-3 h-8 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
                      >
                        Выгнать
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
