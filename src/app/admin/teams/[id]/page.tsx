export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ImageUploader } from "@/components/ImageUploader";
import { adminUploadTeamLogo, adminDeleteTeam } from "../../actions";
import { TeamAdminForm } from "./form";

export default async function AdminTeamEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      captain: { select: { username: true } },
      members: {
        include: {
          user: { select: { username: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!team) notFound();

  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
      <Link
        href="/admin/teams"
        className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
      >
        ← Команды
      </Link>
      <h1 className="text-2xl font-black tracking-tight mb-2">
        {team.name}{" "}
        <span className="text-zinc-500 text-base font-mono">[{team.tag}]</span>
      </h1>
      <p className="text-zinc-400 mb-8 text-sm">
        {team.game} · капитан {team.captain.username} · {team.members.length} игроков
      </p>

      <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Логотип
        </h2>
        <ImageUploader
          currentUrl={team.logoUrl}
          action={adminUploadTeamLogo}
          extraFields={{ teamId: team.id }}
          label="Лого команды"
          hint="PNG / JPG / WebP до 1 МБ. Лучше 256×256 с прозрачностью."
        />
      </section>

      <section className="mb-6">
        <TeamAdminForm
          team={{
            id: team.id,
            name: team.name,
            tag: team.tag,
            description: team.description,
            privacy: team.privacy,
          }}
        />
      </section>

      <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Состав
        </h2>
        <div className="space-y-2">
          {team.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-2 rounded bg-zinc-950/40 border border-zinc-800"
            >
              {m.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.user.avatarUrl}
                  alt={m.user.username}
                  className="w-8 h-8 rounded"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-violet-500/20" />
              )}
              <Link
                href={`/players/${m.user.username}`}
                className="font-bold text-sm hover:text-violet-200"
              >
                {m.user.username}
              </Link>
              <span className="ml-auto text-[10px] font-mono text-zinc-500">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
          ⚠ Опасная зона
        </h2>
        <form action={adminDeleteTeam}>
          <input type="hidden" name="teamId" value={team.id} />
          <button
            type="submit"
            className="text-xs font-mono px-4 h-9 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
          >
            Удалить команду навсегда
          </button>
        </form>
      </section>
    </main>
  );
}
