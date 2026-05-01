"use client";

import { useActionState } from "react";
import { createLfgPost, type LfgFormState } from "./actions";

const REGIONS = [
  { value: "", label: "— любой —" },
  { value: "ALMATY", label: "Алматы" },
  { value: "ASTANA", label: "Астана" },
  { value: "SHYMKENT", label: "Шымкент" },
  { value: "KARAGANDA", label: "Караганда" },
  { value: "AKTAU", label: "Актау" },
  { value: "AKTOBE", label: "Актобе" },
  { value: "PAVLODAR", label: "Павлодар" },
  { value: "ATYRAU", label: "Атырау" },
  { value: "ORAL", label: "Уральск" },
  { value: "KOSTANAY", label: "Костанай" },
  { value: "TARAZ", label: "Тараз" },
  { value: "KZ_OTHER", label: "Другой" },
];

const initialState: LfgFormState = {};

export function LfgForm() {
  const [state, action, pending] = useActionState(createLfgPost, initialState);

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-xs">
          {state.error}
        </div>
      )}

      <Field label="Игра">
        <select name="game" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            — выбери —
          </option>
          <option value="CS2">CS2</option>
          <option value="DOTA2">Dota 2</option>
          <option value="PUBG">PUBG</option>
        </select>
      </Field>

      <Field label="Роль (опционально)">
        <input
          name="inGameRole"
          maxLength={32}
          placeholder="AWP, Carry, Sniper..."
          className={inputCls}
        />
      </Field>

      <Field label="Регион">
        <select name="region" defaultValue="" className={inputCls}>
          {REGIONS.map((r) => (
            <option key={r.value || "any"} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Описание">
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={500}
          rows={4}
          placeholder="Premier 18к, AWP, играю по вечерам, ищу серьёзную команду..."
          className={`${inputCls} resize-none`}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all clip-corner"
      >
        {pending ? "Публикация..." : "Опубликовать"}
      </button>
      <p className="text-[10px] font-mono text-zinc-500 text-center">
        Заявка активна 14 дней. Можешь закрыть в любой момент.
      </p>
    </form>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-10 px-3 text-sm focus:outline-none focus:border-violet-400 transition-colors";

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
