"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCancelLobby } from "./actions";

export function CancelLobbyButton({ lobbyId }: { lobbyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm("Отменить лобби? Все игроки получат уведомление и матч не состоится.")) return;
    startTransition(async () => {
      const res = await adminCancelLobby(lobbyId);
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
      {pending ? "..." : "Отменить"}
    </button>
  );
}
