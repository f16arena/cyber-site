"use client";

import { useActionState } from "react";
import { createTournament, type ActionState } from "../../actions";

const initialState: ActionState = {};

export function TournamentCreateForm() {
  const [state, action, pending] = useActionState(createTournament, initialState);

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 p-4 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Название" full>
          <input
            name="name"
            required
            minLength={3}
            maxLength={80}
            className={inputCls}
            placeholder="Esports.kz Spring Open 2026"
          />
        </Field>

        <Field label="Slug (для URL)">
          <input
            name="slug"
            required
            pattern="[a-z0-9-]{3,40}"
            className={`${inputCls} lowercase`}
            placeholder="spring-open-2026"
          />
        </Field>

        <Field label="Игра">
          <select name="game" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              — выбери —
            </option>
            <option value="CS2">Counter-Strike 2</option>
            <option value="DOTA2">Dota 2</option>
            <option value="PUBG">PUBG</option>
          </select>
        </Field>

        <Field label="Формат">
          <select
            name="format"
            required
            defaultValue="DOUBLE_ELIMINATION"
            className={inputCls}
          >
            <option value="DOUBLE_ELIMINATION">Double Elimination</option>
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="ROUND_ROBIN">Round Robin (групповой)</option>
            <option value="BATTLE_ROYALE_SERIES">Battle Royale Series</option>
          </select>
        </Field>

        <Field label="Команд (4 / 8 / 16)">
          <select name="maxTeams" required defaultValue="8" className={inputCls}>
            <option value="4">4</option>
            <option value="8">8</option>
            <option value="16">16</option>
          </select>
        </Field>

        <Field label="Призовой фонд (₸)">
          <input
            name="prize"
            type="number"
            min={0}
            step={10000}
            defaultValue={0}
            className={inputCls}
            placeholder="500000"
          />
        </Field>

        <Field label="Регистрация закрывается">
          <input
            name="registrationClosesAt"
            type="datetime-local"
            className={inputCls}
          />
        </Field>

        <Field label="Старт турнира">
          <input
            name="startsAt"
            type="datetime-local"
            className={inputCls}
          />
        </Field>

        <Field label="Описание / правила" full>
          <textarea
            name="description"
            rows={6}
            maxLength={2000}
            placeholder="Формат, правила, требования к составу..."
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
          {pending ? "Создание..." : "Создать турнир"}
        </button>
        <a
          href="/admin/tournaments"
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
