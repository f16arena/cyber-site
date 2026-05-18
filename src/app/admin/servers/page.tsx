import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function AdminServersPage() {
  await requireAdmin();

  const servers = await prisma.gameServer.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <PageContainer maxWidth="wide" className="py-6">
      <PageHeader
        title="Игровые серверы CS2"
        subtitle="Управление dedicated-серверами для турнирных матчей. Полный функционал — Phase 8."
        actions={
          <Button size="md" disabled title="Phase 8 — coming soon">
            + Добавить сервер
          </Button>
        }
      />

      {servers.length === 0 ? (
        <EmptyState
          title="Серверов нет"
          description="После Phase 8 здесь будут управление RCON, live-консоль и команды restart_round / kick / change_map."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {servers.map((s) => (
            <div
              key={s.id}
              className="rounded border border-border-default bg-bg-panel p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-text-primary">{s.name}</h3>
                <Badge
                  variant={
                    s.status === "FREE"
                      ? "win"
                      : s.status === "LIVE"
                      ? "live"
                      : s.status === "RESERVED"
                      ? "upcoming"
                      : "finished"
                  }
                  size="sm"
                >
                  {s.status}
                </Badge>
              </div>
              <div className="text-xs font-mono text-text-muted">
                {s.ip}:{s.port}
              </div>
              {s.notes && (
                <p className="text-xs text-text-secondary mt-2">{s.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
