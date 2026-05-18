"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapCard } from "@/components/hub/MapCard";

type Player = {
  steamId: string;
  username: string;
  avatarUrl: string | null;
  elo: number;
  eloDelta: number | null;
};

type Snapshot = {
  id: string;
  state: "PENDING" | "WARMUP" | "LIVE" | "FINISHED" | "CANCELLED";
  map: string;
  scoreA: number;
  scoreB: number;
  winner: "A" | "B" | null;
  connectString: string;
  startedAt: string | null;
  finishedAt: string | null;
  server: { id: string; name: string; ip: string; port: number };
  teamA: Player[];
  teamB: Player[];
};

const MAP_DISPLAY: Record<string, string> = {
  mirage: "Mirage",
  inferno: "Inferno",
  nuke: "Nuke",
  ancient: "Ancient",
  anubis: "Anubis",
  vertigo: "Vertigo",
  dust2: "Dust 2",
};

const STATE_LABEL: Record<Snapshot["state"], string> = {
  PENDING: "Ожидание",
  WARMUP: "Разогрев",
  LIVE: "LIVE",
  FINISHED: "Завершён",
  CANCELLED: "Отменён",
};

function PlayerRow({ p, side }: { p: Player; side: "A" | "B" }) {
  const accent =
    side === "A"
      ? "border-orange-500/30 bg-orange-500/5"
      : "border-rose-500/30 bg-rose-500/5";
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-3 ${accent}`}
    >
      {p.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.avatarUrl}
          alt={p.username}
          className="w-10 h-10 rounded object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
          {p.username[0]?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate text-sm">{p.username}</div>
        <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
          {p.elo} ELO
        </div>
      </div>
      {p.eloDelta !== null && (
        <div
          className={`text-sm font-bold font-mono tabular-nums ${
            p.eloDelta > 0
              ? "text-emerald-300"
              : p.eloDelta < 0
              ? "text-rose-300"
              : "text-zinc-400"
          }`}
        >
          {p.eloDelta > 0 ? "+" : ""}
          {p.eloDelta}
        </div>
      )}
    </div>
  );
}

export function MatchScreen({
  locale,
  matchId,
  isAdmin = false,
}: {
  locale: string;
  matchId: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  const adminFinish = async () => {
    const aRaw = prompt("Счёт Team A:", "16");
    if (aRaw === null) return;
    const bRaw = prompt("Счёт Team B:", "0");
    if (bRaw === null) return;
    const a = Number(aRaw);
    const b = Number(bRaw);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return;
    if (a === b) {
      alert("Ничьи не бывает в BO1 — счёт должен различаться");
      return;
    }
    setAdminBusy(true);
    try {
      const res = await fetch(`/api/admin/hub/match/${matchId}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreA: a, scoreB: b, winner: a > b ? "A" : "B" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Ошибка: ${data?.error ?? res.status}`);
      }
    } finally {
      setAdminBusy(false);
    }
  };

  const adminCancel = async () => {
    if (!confirm("Отменить матч? ELO не изменится.")) return;
    setAdminBusy(true);
    try {
      const res = await fetch(`/api/admin/hub/match/${matchId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Ошибка: ${data?.error ?? res.status}`);
      }
    } finally {
      setAdminBusy(false);
    }
  };

  useEffect(() => {
    const es = new EventSource(`/api/hub/match/${matchId}/stream`);
    es.addEventListener("update", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Snapshot;
        setSnap(data);
        if (data.state === "FINISHED" || data.state === "CANCELLED") {
          // Стрим закрываем, но на дашборд не редиректим — пусть пользователь
          // сам уйдёт. Результат стоит увидеть.
          es.close();
        }
      } catch {
        // ignore
      }
    });
    return () => es.close();
  }, [matchId, router, locale]);

  const onCopy = async () => {
    if (!snap) return;
    try {
      await navigator.clipboard.writeText(snap.connectString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  if (!snap) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center text-zinc-500 font-mono text-sm">
        Загрузка матча...
      </div>
    );
  }

  const matchActive =
    snap.state === "PENDING" ||
    snap.state === "WARMUP" ||
    snap.state === "LIVE";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {isAdmin && matchActive && (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
            ⚙ Admin tools
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={adminFinish}
              disabled={adminBusy}
              className="text-xs font-mono font-bold px-3 h-9 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              ✓ Завершить со счётом
            </button>
            <button
              type="button"
              onClick={adminCancel}
              disabled={adminBusy}
              className="text-xs font-mono font-bold px-3 h-9 rounded border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
            >
              × Отменить матч
            </button>
          </div>
        </section>
      )}

      {/* Header с превью карты */}
      <header className="grid lg:grid-cols-[280px_1fr] gap-4">
        <MapCard mapId={snap.map} state="selected" size="lg" />
        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
              Матч #{snap.id.slice(0, 8)}
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              {MAP_DISPLAY[snap.map] ?? snap.map}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Счёт
              </div>
              <div className="text-4xl font-black tabular-nums">
                <span className="text-orange-300">{snap.scoreA}</span>
                <span className="text-zinc-600 mx-2">:</span>
                <span className="text-rose-300">{snap.scoreB}</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Состояние
              </div>
            <div
              className={`text-sm font-bold font-mono ${
                snap.state === "LIVE"
                  ? "text-rose-300"
                  : snap.state === "FINISHED"
                  ? "text-emerald-300"
                  : "text-zinc-300"
              }`}
            >
              {STATE_LABEL[snap.state]}
            </div>
          </div>
        </div>
        </div>
      </header>

      {/* Connect block */}
      {(snap.state === "PENDING" ||
        snap.state === "WARMUP" ||
        snap.state === "LIVE") && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                Подключение к серверу
              </div>
              <div className="font-mono text-lg text-orange-300">
                {snap.connectString}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                Сервер: {snap.server.name} ({snap.server.ip}:{snap.server.port})
              </div>
            </div>
            <button
              type="button"
              onClick={onCopy}
              className="h-11 px-5 rounded font-bold bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-400 hover:to-rose-500 transition-all"
            >
              {copied ? "Скопировано ✓" : "Копировать connect"}
            </button>
          </div>
          <div className="mt-3 text-[11px] font-mono text-zinc-500">
            Откройте CS2 и вставьте команду в консоль (~). На MVP RCON только
            логируется — конфиг ещё не отправляется на сервер.
          </div>
        </section>
      )}

      {snap.state === "FINISHED" && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-1">
            Результат
          </div>
          <div className="text-2xl font-black tracking-tight">
            Победила {snap.winner === "A" ? "команда A" : "команда B"}
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            ELO игроков обновлено — дельта показана у каждого
          </div>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/hub`)}
            className="mt-4 h-10 px-5 rounded font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 text-sm"
          >
            Вернуться на дашборд
          </button>
        </section>
      )}

      {snap.state === "CANCELLED" && (
        <section className="rounded-xl border border-zinc-700 bg-zinc-900/40 p-5 text-center">
          <div className="text-sm font-bold text-zinc-300">Матч отменён</div>
        </section>
      )}

      {/* Teams */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-orange-300">
              Team A
            </h2>
            <span className="text-2xl font-black text-orange-300 tabular-nums">
              {snap.scoreA}
            </span>
          </div>
          <div className="space-y-2">
            {snap.teamA.map((p) => (
              <PlayerRow key={p.steamId} p={p} side="A" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-rose-300">
              Team B
            </h2>
            <span className="text-2xl font-black text-rose-300 tabular-nums">
              {snap.scoreB}
            </span>
          </div>
          <div className="space-y-2">
            {snap.teamB.map((p) => (
              <PlayerRow key={p.steamId} p={p} side="B" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
