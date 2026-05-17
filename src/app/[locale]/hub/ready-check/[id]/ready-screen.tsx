"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Snapshot = {
  id: string;
  state: "PENDING" | "ACCEPTED" | "FAILED";
  expiresAt: string;
  participants: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    accepted: boolean | null;
  }[];
  acceptedCount: number;
  lobbyId: string | null;
};

export function ReadyScreen({
  locale,
  readyCheckId,
  meUserId,
}: {
  locale: string;
  readyCheckId: string;
  meUserId: string;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [submitting, setSubmitting] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/hub/ready-check/${readyCheckId}/stream`);
    es.addEventListener("update", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Snapshot;
        setSnap(data);
        if (data.state === "ACCEPTED") {
          if (data.lobbyId) {
            router.push(`/${locale}/hub/lobby/${data.lobbyId}`);
          } else {
            // Лобби пока не создаётся (этап 3) — но пользователь должен увидеть успех
            setTimeout(() => router.push(`/${locale}/hub`), 1500);
          }
          es.close();
          return;
        }
        if (data.state === "FAILED") {
          setTimeout(() => router.push(`/${locale}/hub`), 1500);
          es.close();
        }
      } catch {
        // ignore
      }
    });
    es.addEventListener("error", () => {
      setError("Соединение потеряно");
    });
    return () => es.close();
  }, [router, locale, readyCheckId]);

  const me = snap?.participants.find((p) => p.userId === meUserId);
  const myAccepted = me?.accepted;

  const expiresAt = snap ? new Date(snap.expiresAt).getTime() : 0;
  const remainingMs = Math.max(0, expiresAt - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const totalDurationMs = 30_000;
  const progress = expiresAt ? Math.min(remainingMs / totalDurationMs, 1) : 0;

  const respond = async (accept: boolean) => {
    setSubmitting(accept ? "accept" : "decline");
    setError(null);
    try {
      const res = await fetch(`/api/hub/ready-check/${readyCheckId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка");
      }
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setSubmitting(null);
    }
  };

  const stateLabel = useMemo(() => {
    if (!snap) return "Загрузка...";
    if (snap.state === "ACCEPTED") return "МАТЧ НАЙДЕН";
    if (snap.state === "FAILED") return "ОТМЕНЁН";
    return "READY CHECK";
  }, [snap]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-2xl border border-orange-500/40 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8">
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-2 text-center">
          Подтвердите участие
        </div>
        <h1 className="text-3xl font-black tracking-tight text-center mb-4">
          {stateLabel}
        </h1>

        {snap?.state === "PENDING" && (
          <>
            <div className="text-6xl font-black tabular-nums text-center my-6">
              <span
                className={
                  remainingSec <= 10 ? "text-rose-400" : "text-orange-300"
                }
              >
                {remainingSec}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden mb-6">
              <div
                className={`h-full transition-all duration-200 ${
                  remainingSec <= 10
                    ? "bg-gradient-to-r from-rose-500 to-rose-700"
                    : "bg-gradient-to-r from-orange-500 to-rose-600"
                }`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </>
        )}

        {snap?.state === "ACCEPTED" && (
          <div className="text-center text-emerald-300 font-bold my-6">
            Все приняли — переходим в лобби...
          </div>
        )}

        {snap?.state === "FAILED" && (
          <div className="text-center text-rose-300 font-bold my-6">
            Кто-то не принял. Возвращаем в очередь...
          </div>
        )}

        {/* Сетка участников 5×2 */}
        {snap && (
          <div className="grid grid-cols-5 gap-2 mb-6">
            {snap.participants.map((p) => (
              <div
                key={p.userId}
                className={`relative rounded-lg border p-2 text-center ${
                  p.accepted === true
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : p.accepted === false
                    ? "border-rose-500/50 bg-rose-500/10"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatarUrl}
                    alt={p.username}
                    className="w-10 h-10 rounded mx-auto mb-1 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-zinc-800 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {p.username[0]?.toUpperCase()}
                  </div>
                )}
                <div className="text-[10px] font-mono truncate text-zinc-300">
                  {p.username}
                </div>
                <div className="text-[9px] font-mono mt-0.5">
                  {p.accepted === true && (
                    <span className="text-emerald-400">✓ READY</span>
                  )}
                  {p.accepted === false && (
                    <span className="text-rose-400">✗ DECLINED</span>
                  )}
                  {p.accepted === null && (
                    <span className="text-zinc-500">— ждём —</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Действия */}
        {snap?.state === "PENDING" && (
          <>
            {myAccepted === null ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => respond(false)}
                  disabled={!!submitting}
                  className="h-12 rounded font-bold border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                >
                  {submitting === "decline" ? "..." : "DECLINE"}
                </button>
                <button
                  type="button"
                  onClick={() => respond(true)}
                  disabled={!!submitting}
                  className="h-12 rounded font-bold bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-400 hover:to-rose-500 disabled:opacity-50 transition-all"
                >
                  {submitting === "accept" ? "..." : "ACCEPT"}
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-zinc-400 font-mono">
                {myAccepted ? "Вы готовы. Ждём остальных..." : "Вы отклонили."}
              </div>
            )}
            <div className="text-center mt-3 text-xs font-mono text-zinc-500">
              Принято: {snap.acceptedCount} / {snap.participants.length}
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 text-sm text-rose-300 font-mono text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
