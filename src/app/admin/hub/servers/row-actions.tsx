"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteHubServer, toggleHubServerOffline } from "./actions";

export function RowActions({
  id,
  status,
}: {
  id: string;
  status: "FREE" | "RESERVED" | "LIVE" | "OFFLINE";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onToggle = () => {
    startTransition(async () => {
      const res = await toggleHubServerOffline(id);
      if (!res.ok) alert(`Ошибка: ${res.error}`);
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!confirm("Удалить сервер? Действие необратимо.")) return;
    startTransition(async () => {
      const res = await deleteHubServer(id);
      if (!res.ok) alert(`Ошибка: ${res.error}`);
      router.refresh();
    });
  };

  const inUse = status === "RESERVED" || status === "LIVE";

  return (
    <div className="flex gap-2 justify-end">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending || inUse}
        className="text-xs font-mono px-2 py-1 rounded border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 disabled:opacity-30"
      >
        {status === "OFFLINE" ? "Включить" : "Выкл."}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending || inUse}
        className="text-xs font-mono px-2 py-1 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 disabled:opacity-30"
      >
        Удалить
      </button>
    </div>
  );
}
