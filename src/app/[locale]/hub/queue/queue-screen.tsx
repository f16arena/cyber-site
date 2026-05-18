"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Snapshot = {
  ticket: {
    id: string;
    status: "SEARCHING" | "READY_CHECK" | "MATCHED" | "CANCELLED";
    joinedAt: string;
    readyCheckId: string | null;
  } | null;
  queueCount: number;
  lobbyId: string | null;
};

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function QueueScreen({
  locale,
  canSeedBots = false,
}: {
  locale: string;
  canSeedBots?: boolean;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);

  // Локальный таймер с момента joinedAt
  useEffect(() => {
    if (!snap?.ticket?.joinedAt) return;
    const start = new Date(snap.ticket.joinedAt).getTime();
    const tick = () => setElapsed((Date.now() - start) / 1000);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [snap?.ticket?.joinedAt]);

  // SSE подписка
  useEffect(() => {
    const es = new EventSource("/api/hub/queue/stream");
    es.addEventListener("update", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Snapshot;
        setSnap(data);

        // Терминальные состояния — редиректим
        if (data.ticket?.status === "READY_CHECK" && data.ticket.readyCheckId) {
          router.push(`/${locale}/hub/ready-check/${data.ticket.readyCheckId}`);
          es.close();
          return;
        }
        if (data.lobbyId) {
          router.push(`/${locale}/hub/lobby/${data.lobbyId}`);
          es.close();
          return;
        }
        if (!data.ticket) {
          // Вышли из очереди — на дашборд
          router.push(`/${locale}/hub`);
          es.close();
          return;
        }
      } catch {
        // ignore parse errors
      }
    });
    es.addEventListener("error", () => {
      setError("Соединение с сервером потеряно");
    });
    return () => es.close();
  }, [router, locale]);

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/hub/queue/leave", { method: "POST" });
      if (res.ok) {
        router.push(`/${locale}/hub`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Не удалось отменить");
        setCancelling(false);
      }
    } catch {
      setError("Сетевая ошибка");
      setCancelling(false);
    }
  };

  // dev only
  const fillBots = async () => {
    await fetch("/api/hub/_dev/fill-bots", { method: "POST" }).catch(() => undefined);
  };

  const queueCount = snap?.queueCount ?? 1;
  const needed = 10;
  const progress = Math.min(queueCount / needed, 1);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 text-center">
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-2">
          Поиск матча
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-2">SEARCHING</h1>
        <div className="text-5xl font-black tabular-nums text-orange-300 my-6">
          {formatElapsed(elapsed)}
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 mb-4">
          <div className="relative w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-75" />
            <span className="absolute inset-0 rounded-full bg-orange-500" />
          </div>
          <span className="font-mono">
            {queueCount} / {needed} в очереди
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mb-8">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-rose-600 transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <button
          type="button"
          onClick={cancel}
          disabled={cancelling}
          className="w-full h-11 rounded font-bold border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          {cancelling ? "Отменяем..." : "Отменить поиск"}
        </button>

        {error && (
          <div className="mt-4 text-sm text-rose-300 font-mono">{error}</div>
        )}

        {(process.env.NODE_ENV !== "production" || canSeedBots) && (
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              {process.env.NODE_ENV !== "production" ? "DEV" : "ADMIN"}
            </div>
            <button
              type="button"
              onClick={fillBots}
              className="text-xs font-mono px-3 py-1.5 rounded border border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              + 9 ботов в очередь
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
