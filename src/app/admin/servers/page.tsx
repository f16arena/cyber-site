import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { pingControl } from "@/lib/server/control-client";
import { PageContainer, PageHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

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

export default async function AdminServersPage() {
  await requireAdmin();

  const [servers, control] = await Promise.all([
    prisma.gameServer.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { commandLogs: true } } },
    }),
    pingControl(),
  ]);

  return (
    <PageContainer maxWidth="wide" className="py-6">
      <Link
        href="/admin"
        className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-3"
      >
        ← Админка
      </Link>

      <PageHeader
        title="Игровые серверы CS2"
        subtitle="Управление dedicated-серверами для турнирных матчей. RCON-команды и live-консоль идут через домашний srv-control."
        actions={
          <Link href="/admin/servers/new">
            <Button size="md">+ Добавить сервер</Button>
          </Link>
        }
      />

      {/* srv-control health */}
      <div
        className={`mb-5 rounded border p-3 text-[12px] flex items-center gap-3 ${
          control.ok
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-rose-500/40 bg-rose-500/5"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            control.ok ? "bg-emerald-400" : "bg-rose-400 animate-pulse"
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-text-primary">
            srv-control:{" "}
            {control.ok ? (
              <span className="text-emerald-300">подключён</span>
            ) : (
              <span className="text-rose-300">недоступен</span>
            )}
          </div>
          <div className="text-text-muted font-mono text-[11px] truncate">
            {control.ok
              ? `${control.servers} сервер(ов) сконфигурировано в .env домашнего ПК`
              : control.error}
          </div>
        </div>
        {!control.ok && (
          <Link
            href="/HOME_SERVER_SETUP.md"
            className="text-[11px] font-mono text-brand-blue hover:text-brand-blue-hover shrink-0"
          >
            гайд »
          </Link>
        )}
      </div>

      {servers.length === 0 ? (
        <EmptyState
          title="Серверов нет"
          description="Добавь запись CS2-сервера: LAN-IP, порт, RCON-пароль. Подключится к srv-control дома."
          action={
            <Link href="/admin/servers/new">
              <Button size="md">+ Добавить сервер</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {servers.map((s) => (
            <Link
              key={s.id}
              href={`/admin/servers/${s.id}`}
              className="rounded border border-border-default bg-bg-panel hover:border-brand-yellow/40 hover:bg-bg-elevated transition-colors p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold tracking-tight text-text-primary">
                  {s.name}
                </h3>
                <Badge variant={statusVariant(s.status)} size="sm">
                  {s.status}
                </Badge>
              </div>
              <div className="text-[11px] font-mono text-text-secondary">
                {s.ip}:{s.port}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-1">
                RCON :{s.rconPort} · {s._count.commandLogs} команд в логе
              </div>
              {s.notes && (
                <p className="text-[12px] text-text-secondary mt-2 line-clamp-2">
                  {s.notes}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
