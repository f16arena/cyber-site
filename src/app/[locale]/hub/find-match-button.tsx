"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FindMatchButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hub/queue/join", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.error === "ask_party_leader") {
          setError("Вы в party — пусть лидер ищет матч");
          setLoading(false);
          return;
        }
        if (data?.error === "in_lobby" || data?.error === "in_match") {
          setError("Вы уже в активном лобби/матче");
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

      // Если сразу собрался ready-check — туда. Иначе в очередь.
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
    <div className="flex flex-col w-full">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full h-14 rounded font-black tracking-wide bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-400 hover:to-rose-500 disabled:opacity-50 transition-all"
      >
        {loading ? "..." : "FIND MATCH"}
      </button>
      {error && (
        <div className="mt-2 text-xs font-mono text-rose-300 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
