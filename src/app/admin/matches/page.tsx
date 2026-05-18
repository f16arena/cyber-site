export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { MatchStatus } from "@prisma/client";

function statusVariant(s: MatchStatus) {
  switch (s) {
    case "LIVE":
      return "live" as const;
    case "FINISHED":
      return "finished" as const;
    case "SCHEDULED":
      return "upcoming" as const;
    default:
      return "default" as const;
  }
}

export default async function AdminMatchesPage() {
  await requireAdmin();

  const matches = await prisma.match.findMany({
    include: {
      teamA: { select: { name: true, tag: true } },
      teamB: { select: { name: true, tag: true } },
      tournament: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PageContainer maxWidth="default" className="py-6">
      <Link
        href="/admin"
        className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-3"
      >
        ← Админка
      </Link>
      <h1 className="text-xl font-bold tracking-tight mb-5">
        Матчи <span className="text-text-muted font-mono">· {matches.length}</span>
      </h1>

      {matches.length === 0 ? (
        <EmptyState
          title="Матчей пока нет"
          description="Создай турнир и сгенерируй сетку — матчи появятся автоматически."
        />
      ) : (
        <div className="rounded border border-border-default bg-bg-panel divide-y divide-border-default">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/admin/matches/${m.id}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-bg-elevated transition-colors text-[13px]"
            >
              <Badge variant={statusVariant(m.status)} size="sm">
                {m.status}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-tight">
                  {m.teamA?.name ?? "TBD"}
                  <span className="text-text-muted font-mono mx-2 tabular-nums">
                    {m.scoreA}:{m.scoreB}
                  </span>
                  {m.teamB?.name ?? "TBD"}
                </div>
                <div className="text-[10px] font-mono text-text-muted mt-0.5 truncate">
                  {m.tournament?.name || "—"} · {m.stage ?? "—"}
                  {m.map && ` · ${m.map}`}
                </div>
              </div>
              <span className="text-[11px] font-mono text-brand-blue shrink-0">
                »
              </span>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
