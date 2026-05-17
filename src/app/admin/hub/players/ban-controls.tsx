"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminBanHubPlayer, adminUnbanHubPlayer } from "./actions";

const ERR: Record<string, string> = {
  userId_required: "Нет userId",
  user_not_found: "Игрок не найден",
  invalid_duration: "Неверная длительность",
};

export function BanControls({
  userId,
  isBanned,
}: {
  userId: string;
  isBanned: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onUnban = () => {
    if (!confirm("Снять бан?")) return;
    startTransition(async () => {
      const res = await adminUnbanHubPlayer(userId);
      if (!res.ok) setError(ERR[res.error] ?? res.error);
      else router.refresh();
    });
  };

  const onBan = (formData: FormData) => {
    setError(null);
    formData.set("userId", userId);
    startTransition(async () => {
      const res = await adminBanHubPlayer(formData);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(ERR[res.error] ?? res.error);
      }
    });
  };

  if (isBanned) {
    return (
      <button
        type="button"
        onClick={onUnban}
        disabled={pending}
        className="text-xs font-mono px-2 py-1 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
      >
        Разбанить
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-mono px-2 py-1 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
      >
        Забанить
      </button>
    );
  }

  return (
    <form action={onBan} className="flex items-center gap-1 flex-wrap">
      <select
        name="duration"
        defaultValue="1d"
        className="h-8 rounded bg-zinc-900 border border-zinc-700 px-2 text-xs font-mono"
      >
        <option value="1d">1 день</option>
        <option value="7d">7 дней</option>
        <option value="30d">30 дней</option>
        <option value="perm">Навсегда</option>
      </select>
      <input
        name="reason"
        placeholder="причина"
        className="h-8 rounded bg-zinc-900 border border-zinc-700 px-2 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 px-2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold disabled:opacity-50"
      >
        Бан
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="h-8 px-2 rounded border border-zinc-700 text-zinc-400 text-xs"
      >
        Отмена
      </button>
      {error && (
        <span className="text-[10px] font-mono text-rose-300 w-full">{error}</span>
      )}
    </form>
  );
}
