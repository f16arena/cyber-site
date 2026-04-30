"use client";

import { useActionState } from "react";
import { createSeason, type ActionState } from "../actions";

const initial: ActionState = {};

export function SeasonForm() {
  const [state, action, pending] = useActionState(createSeason, initial);
  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-2 text-xs">
          {state.error}
        </div>
      )}
      <Field label="Название">
        <input name="name" required minLength={3} className={inputCls} placeholder="Spring 2026" />
      </Field>
      <Field label="Slug">
        <input name="slug" required pattern="[a-z0-9-]{3,40}" className={`${inputCls} lowercase`} placeholder="spring-2026" />
      </Field>
      <Field label="Игра (опционально)">
        <select name="game" defaultValue="" className={inputCls}>
          <option value="">— все —</option>
          <option value="CS2">CS2</option>
          <option value="DOTA2">Dota 2</option>
          <option value="PUBG">PUBG</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Начало">
          <input name="startsAt" type="date" required className={inputCls} />
        </Field>
        <Field label="Конец">
          <input name="endsAt" type="date" required className={inputCls} />
        </Field>
      </div>
      <button type="submit" disabled={pending} className="w-full h-10 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all">
        {pending ? "..." : "Создать"}
      </button>
    </form>
  );
}

const inputCls = "w-full bg-zinc-900/60 border border-zinc-700 rounded h-10 px-3 text-sm focus:outline-none focus:border-violet-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
