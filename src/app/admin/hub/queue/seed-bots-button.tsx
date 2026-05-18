"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SeedBotsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/hub/admin/seed-bots", { method: "POST" });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          created?: string[];
          error?: string;
        };
        if (!res.ok) {
          setError(data?.error ?? `HTTP ${res.status}`);
          return;
        }
        setInfo(
          data.created && data.created.length > 0
            ? `Создано ботов: ${data.created.join(", ")}`
            : "Все боты уже в очереди"
        );
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="text-xs font-mono px-3 h-9 inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
      >
        {pending ? "..." : "+ 9 ботов в очередь"}
      </button>
      {info && <span className="text-[11px] font-mono text-emerald-300">{info}</span>}
      {error && <span className="text-[11px] font-mono text-rose-300">{error}</span>}
    </div>
  );
}
