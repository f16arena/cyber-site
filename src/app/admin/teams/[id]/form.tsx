"use client";

import { useActionState } from "react";
import { adminUpdateTeam, type ActionState } from "../../actions";

const initial: ActionState = {};

export function TeamAdminForm({
  team,
}: {
  team: {
    id: string;
    name: string;
    tag: string;
    description: string | null;
    privacy: string;
  };
}) {
  const [state, action, pending] = useActionState(adminUpdateTeam, initial);
  return (
    <form action={action} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400">
        Основные данные
      </h2>
      <input type="hidden" name="teamId" value={team.id} />
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
          {state.error}
        </div>
      )}
      <Field label="Название">
        <input name="name" defaultValue={team.name} required minLength={2} maxLength={40} className={inputCls} />
      </Field>
      <Field label="Тег">
        <input name="tag" defaultValue={team.tag} required pattern="[A-Za-z0-9]{2,5}" className={`${inputCls} uppercase`} />
      </Field>
      <Field label="Приватность">
        <select name="privacy" defaultValue={team.privacy} className={inputCls}>
          <option value="PUBLIC">🔓 Открытая</option>
          <option value="PRIVATE">🔒 Закрытая</option>
        </select>
      </Field>
      <Field label="Описание">
        <textarea name="description" defaultValue={team.description ?? ""} rows={3} maxLength={500} className={`${inputCls} resize-none h-auto`} />
      </Field>
      <button type="submit" disabled={pending} className="h-10 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50">
        {pending ? "..." : "Сохранить"}
      </button>
    </form>
  );
}

const inputCls = "w-full bg-zinc-900/60 border border-zinc-700 rounded h-10 px-3 text-sm focus:outline-none focus:border-violet-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
