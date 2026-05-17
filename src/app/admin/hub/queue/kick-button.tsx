"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminRemoveFromQueue } from "./actions";

export function KickButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Убрать игрока из очереди?")) return;
    startTransition(async () => {
      const res = await adminRemoveFromQueue(ticketId);
      if (!res.ok) alert(`Ошибка: ${res.error}`);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs font-mono px-2 py-1 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
    >
      {pending ? "..." : "Убрать"}
    </button>
  );
}
