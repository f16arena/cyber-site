"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "SOLO" | "DUO" | "FIVE";

const MODES: { id: Mode; label: string; sub: string }[] = [
  { id: "SOLO", label: "1v1", sub: "Дуэль" },
  { id: "DUO", label: "2v2", sub: "Маленькая" },
  { id: "FIVE", label: "5v5", sub: "Классика" },
];

export function FindMatchButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("FIVE");

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hub/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.error === "ask_party_leader") {
          setError("Вы в party — пусть лидер ищет матч");
          setLoading(false);
          return;
        }
        if (data?.error === "in_lobby" || data?.error === "in_match") {
          setError("Вы уже в активном лобби/матче (или party больше размера команды)");
          setLoading(false);
          return;
        }
        if (data?.error === "cooldown") {
          setError(
            `Cooldown до ${new Date(data.until).toLocaleTimeString("ru-RU")}`
          );
          setLoading(false);
          return;
        }
        if (data?.error === "banned") {
          setError("Вы забанены в hub");
          setLoading(false);
          return;
        }
        setError(data?.error ?? "Ошибка");
        setLoading(false);
        return;
      }

      if (data?.readyCheckId) {
        router.push(`/${locale}/hub/ready-check/${data.readyCheckId}`);
      } else {
        router.push(`/${locale}/hub/queue`);
      }
    } catch {
      setError("Сетевая ошибка");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-3">
      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex flex-col items-center justify-center rounded py-2 transition-all border ${
                active
                  ? "bg-gradient-to-br from-orange-500/30 to-rose-600/30 border-orange-400 text-orange-200"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <span className="text-sm font-black tracking-tight">{m.label}</span>
              <span className="text-[9px] font-mono uppercase tracking-widest opacity-70">
                {m.sub}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full h-14 rounded font-black tracking-wide bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-400 hover:to-rose-500 disabled:opacity-50 transition-all"
      >
        {loading ? "..." : `FIND MATCH · ${MODES.find((m) => m.id === mode)?.label}`}
      </button>
      {error && (
        <div className="text-xs font-mono text-rose-300 text-center">{error}</div>
      )}
    </div>
  );
}
