"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminFinishMatch, adminCancelMatch } from "./actions";

const ERROR_LABELS: Record<string, string> = {
  not_found: "Матч не найден",
  already_finished: "Матч уже завершён",
  invalid_score: "Счёт несовместим с победителем",
  winner_required: "Выберите победителя",
};

export function FinishMatchForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onFinish = (formData: FormData) => {
    setError(null);
    setInfo(null);
    formData.set("matchId", matchId);
    startTransition(async () => {
      const res = await adminFinishMatch(formData);
      if (res.ok) {
        setInfo(`Готово. ΔELO: A ${res.deltaA! >= 0 ? "+" : ""}${res.deltaA}, B ${res.deltaB! >= 0 ? "+" : ""}${res.deltaB}`);
        router.refresh();
      } else {
        setError(ERROR_LABELS[res.error] ?? res.error);
      }
    });
  };

  const onCancel = () => {
    if (!confirm("Отменить матч? ELO не изменится.")) return;
    startTransition(async () => {
      const res = await adminCancelMatch(matchId);
      if (res.ok) {
        router.refresh();
      } else {
        setError(ERROR_LABELS[res.error] ?? res.error);
      }
    });
  };

  return (
    <form action={onFinish} className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
            A
          </span>
          <input
            name="scoreA"
            type="number"
            min={0}
            max={99}
            defaultValue={0}
            required
            className="w-14 h-9 rounded bg-zinc-900 border border-zinc-800 px-2 text-sm font-mono text-center"
          />
        </label>
        <span className="text-zinc-600">:</span>
        <label className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
            B
          </span>
          <input
            name="scoreB"
            type="number"
            min={0}
            max={99}
            defaultValue={0}
            required
            className="w-14 h-9 rounded bg-zinc-900 border border-zinc-800 px-2 text-sm font-mono text-center"
          />
        </label>
        <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
            Победитель
          </span>
          <div className="flex gap-1 mt-1">
            <label className="text-xs font-mono">
              <input type="radio" name="winner" value="A" className="mr-1" /> A
            </label>
            <label className="text-xs font-mono">
              <input type="radio" name="winner" value="B" className="mr-1" /> B
            </label>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <button
            type="submit"
            disabled={pending}
            className="h-9 px-3 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50 text-xs font-bold"
          >
            {pending ? "..." : "Завершить"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-9 px-3 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 text-xs font-bold"
          >
            Отменить
          </button>
        </div>
      </div>
      {error && <div className="text-[11px] font-mono text-rose-300">{error}</div>}
      {info && <div className="text-[11px] font-mono text-emerald-300">{info}</div>}
    </form>
  );
}
