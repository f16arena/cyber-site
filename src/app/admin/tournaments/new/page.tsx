import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { TournamentCreateForm } from "./form";
import { deleteTournamentTemplate } from "../../actions";

export const dynamic = "force-dynamic";

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  await requireAdmin();
  const { template: templateId } = await searchParams;

  const [templates, selectedTemplate] = await Promise.all([
    prisma.tournamentTemplate.findMany({
      orderBy: { createdAt: "desc" },
    }),
    templateId
      ? prisma.tournamentTemplate.findUnique({ where: { id: templateId } })
      : Promise.resolve(null),
  ]);

  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-12">
      <Link
        href="/admin/tournaments"
        className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
      >
        ← Турниры
      </Link>
      <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight mb-6">
        Создать турнир
      </h1>

      {templates.length > 0 && (
        <section className="mb-6 rounded-lg border border-violet-500/20 bg-violet-500/5 p-5">
          <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
            Шаблоны ({templates.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => {
              const active = templateId === tpl.id;
              return (
                <Link
                  key={tpl.id}
                  href={
                    active
                      ? "/admin/tournaments/new"
                      : `/admin/tournaments/new?template=${tpl.id}`
                  }
                  className={`text-xs font-mono px-3 h-9 inline-flex items-center rounded border transition-all ${
                    active
                      ? "bg-violet-500/20 text-violet-200 border-violet-500/50"
                      : "border-zinc-700 hover:border-violet-400 text-zinc-300"
                  }`}
                >
                  {tpl.game} · {tpl.name}
                </Link>
              );
            })}
          </div>
          {selectedTemplate && (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400">
                ↑ Использован шаблон: <strong>{selectedTemplate.name}</strong>
              </span>
              <form action={deleteTournamentTemplate}>
                <input type="hidden" name="id" value={selectedTemplate.id} />
                <button
                  type="submit"
                  className="text-xs font-mono text-rose-400 hover:text-rose-300"
                >
                  Удалить шаблон
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      <TournamentCreateForm
        defaults={
          selectedTemplate
            ? {
                game: selectedTemplate.game,
                format: selectedTemplate.format,
                prize: Number(selectedTemplate.prize) / 100,
                maxTeams: selectedTemplate.maxTeams,
                description: selectedTemplate.description ?? "",
              }
            : undefined
        }
      />
    </main>
  );
}
