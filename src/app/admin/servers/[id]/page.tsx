import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { execServerCommand, deleteGameServer } from "../actions";

export const dynamic = "force-dynamic";

// Быстрые RCON-команды
const QUICK_COMMANDS: Array<{ label: string; cmd: string; danger?: boolean }> =
  [
    { label: "Restart round", cmd: "mp_restartgame 1" },
    { label: "Restart match", cmd: "matchzy_reset_match" },
    { label: "Pause match", cmd: "mp_pause_match" },
    { label: "Unpause", cmd: "mp_unpause_match" },
    { label: "Swap teams", cmd: "mp_swapteams" },
    {
      label: "Force end match",
      cmd: "matchzy_force_end",
      danger: true,
    },
  ];

function statusVariant(s: string) {
  switch (s) {
    case "FREE":
      return "win" as const;
    case "RESERVED":
      return "upcoming" as const;
    case "LIVE":
      return "live" as const;
    case "OFFLINE":
      return "loss" as const;
    default:
      return "default" as const;
  }
}

export default async function ServerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const server = await prisma.gameServer.findUnique({
    where: { id },
    include: {
      commandLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });
  if (!server) notFound();

  // Подгрузим имена админов для лога
  const adminIds = Array.from(
    new Set(
      server.commandLogs
        .map((l) => l.adminId)
        .filter((x): x is string => x !== null)
    )
  );
  const admins = adminIds.length
    ? await prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { id: true, username: true },
      })
    : [];
  const adminById = new Map(admins.map((a) => [a.id, a]));

  return (
    <PageContainer maxWidth="wide" className="py-6">
      <Link
        href="/admin/servers"
        className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-3"
      >
        ← Серверы
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={statusVariant(server.status)} size="md">
              {server.status}
            </Badge>
          </div>
          <h1 className="text-xl font-bold tracking-tight">{server.name}</h1>
          <p className="text-[13px] font-mono text-text-secondary mt-0.5">
            {server.ip}:{server.port} · RCON :{server.rconPort}
          </p>
        </div>
        <form action={deleteGameServer}>
          <input type="hidden" name="id" value={server.id} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-rose-300 hover:text-rose-200"
          >
            Удалить
          </Button>
        </form>
      </div>

      {server.notes && (
        <p className="text-[13px] text-text-secondary mb-5">{server.notes}</p>
      )}

      {/* Quick RCON commands */}
      <section className="rounded border border-border-default bg-bg-panel p-4 mb-4">
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-3">
          Быстрые команды
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_COMMANDS.map((q) => (
            <form key={q.cmd} action={execServerCommand} className="contents">
              <input type="hidden" name="serverId" value={server.id} />
              <input type="hidden" name="command" value={q.cmd} />
              <Button
                type="submit"
                size="sm"
                variant={q.danger ? "destructive" : "secondary"}
              >
                {q.label}
              </Button>
            </form>
          ))}
        </div>

        {/* Free-form command */}
        <form
          action={execServerCommand}
          className="flex flex-wrap items-end gap-2 pt-3 border-t border-border-default"
        >
          <input type="hidden" name="serverId" value={server.id} />
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-text-muted mb-1">
              Своя команда
            </label>
            <input
              name="command"
              required
              placeholder="mp_warmuptime 30"
              className="w-full bg-bg-elevated border border-border-default rounded-sm h-8 px-2 text-[12px] font-mono focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <Button type="submit" size="md">
            Отправить
          </Button>
        </form>
      </section>

      {/* Command history */}
      <section>
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-2">
          История команд ({server.commandLogs.length})
        </h2>
        {server.commandLogs.length === 0 ? (
          <EmptyState compact title="Команд ещё не отправлялось" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Время</Th>
                <Th>Команда</Th>
                <Th>Админ</Th>
                <Th align="right">Статус</Th>
              </Tr>
            </Thead>
            <Tbody>
              {server.commandLogs.map((log) => {
                const admin = log.adminId
                  ? adminById.get(log.adminId)
                  : null;
                return (
                  <Tr key={log.id}>
                    <Td className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                      {log.createdAt.toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </Td>
                    <Td className="font-mono">
                      <span className="text-text-primary">{log.command}</span>
                      {log.response && (
                        <div className="text-[10px] text-text-muted mt-0.5 line-clamp-1">
                          → {log.response}
                        </div>
                      )}
                    </Td>
                    <Td className="text-text-secondary">
                      {admin?.username ?? "—"}
                    </Td>
                    <Td align="right">
                      <Badge
                        variant={log.success ? "win" : "loss"}
                        size="sm"
                      >
                        {log.success ? "ok" : "fail"}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </section>
    </PageContainer>
  );
}
