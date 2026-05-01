"use client";

import { useActionState } from "react";
import { claimMatchResult, type ClaimState } from "../actions";

const initial: ClaimState = {};

export function ClaimResultForm({
  matchId,
  tagA,
  tagB,
  currentClaim,
  opponentClaimed,
  hasDispute,
}: {
  matchId: string;
  tagA: string;
  tagB: string;
  currentClaim?: { scoreA: number; scoreB: number; map: string | null } | null | undefined | false;
  opponentClaimed?: boolean | null | undefined;
  hasDispute?: boolean;
}) {
  const [state, action, pending] = useActionState(claimMatchResult, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="matchId" value={matchId} />
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-2 text-xs">
          {state.error}
        </div>
      )}
      {hasDispute && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
          ⚠ Результаты команд не совпадают. Админ примет финальное решение.
        </div>
      )}
      {opponentClaimed && !hasDispute && currentClaim && (
        <div className="rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-3 text-sm">
          ✓ Результат подтверждён обеими командами.
        </div>
      )}
      {opponentClaimed && !currentClaim && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 text-amber-300 p-3 text-sm">
          Соперник уже заявил результат. Подтверди или оспорь.
        </div>
      )}

      <div className="grid sm:grid-cols-4 gap-3 items-end">
        <Field label={`Счёт ${tagA}`}>
          <input
            name="scoreA"
            type="number"
            min={0}
            defaultValue={(currentClaim && currentClaim.scoreA) || 0}
            className={inputCls}
          />
        </Field>
        <Field label={`Счёт ${tagB}`}>
          <input
            name="scoreB"
            type="number"
            min={0}
            defaultValue={(currentClaim && currentClaim.scoreB) || 0}
            className={inputCls}
          />
        </Field>
        <Field label="Карта (опц.)">
          <input
            name="map"
            defaultValue={(currentClaim && currentClaim.map) || ""}
            placeholder="Mirage / Inferno"
            className={inputCls}
          />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50"
        >
          {pending ? "..." : currentClaim ? "Обновить" : "Заявить"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-11 px-3 text-sm focus:outline-none focus:border-violet-400";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
