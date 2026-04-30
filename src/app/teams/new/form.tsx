"use client";

import { useActionState } from "react";
import { createTeam, type TeamFormState } from "../actions";

const REGIONS = [
  { value: "", label: "— не указан —" },
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
  { value: "KZ_OTHER", label: "Другой город" },
];

const initialState: TeamFormState = {};

export function TeamCreateForm() {
  const [state, formAction, pending] = useActionState(createTeam, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 p-4 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Название команды">
          <input
            name="name"
            required
            minLength={2}
            maxLength={40}
            className={inputCls}
            placeholder="Tulpar Esports"
          />
        </Field>
        <Field label="Тег (2–5 символов, латиница)">
          <input
            name="tag"
            required
            minLength={2}
            maxLength={5}
            pattern="[A-Za-z0-9]{2,5}"
            className={`${inputCls} uppercase`}
            placeholder="TLP"
          />
        </Field>
        <Field label="Дисциплина">
          <select name="game" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              — выбери игру —
            </option>
            <option value="CS2">Counter-Strike 2</option>
            <option value="DOTA2">Dota 2</option>
            <option value="PUBG">PUBG</option>
          </select>
        </Field>
        <Field label="Регион">
          <select name="region" defaultValue="" className={inputCls}>
            {REGIONS.map((r) => (
              <option key={r.value || "empty"} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Описание команды" full>
          <textarea
            name="description"
            rows={4}
            maxLength={500}
            placeholder="Цели, состав, время игр..."
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all clip-corner"
        >
          {pending ? "Создание..." : "Создать команду"}
        </button>
        <a
          href="/teams"
          className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider border border-zinc-700 hover:border-zinc-500 transition-all clip-corner"
        >
          Отмена
        </a>
      </div>
    </form>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors";

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
