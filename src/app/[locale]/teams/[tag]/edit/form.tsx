"use client";

import { useActionState } from "react";
import { updateTeam, type TeamFormState } from "../../actions";

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
  { value: "KZ_OTHER", label: "Другой" },
];

const initial: TeamFormState = {};

export function TeamEditForm({
  team,
}: {
  team: {
    id: string;
    name: string;
    description: string | null;
    region: string | null;
    privacy: string;
  };
}) {
  const [state, action, pending] = useActionState(updateTeam, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="teamId" value={team.id} />
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
          {state.error}
        </div>
      )}

      <Field label="Название">
        <input
          name="name"
          required
          minLength={2}
          maxLength={40}
          defaultValue={team.name}
          className={inputCls}
        />
      </Field>
      <Field label="Регион">
        <select name="region" defaultValue={team.region ?? ""} className={inputCls}>
          {REGIONS.map((r) => (
            <option key={r.value || "empty"} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Приватность">
        <select name="privacy" defaultValue={team.privacy} className={inputCls}>
          <option value="PUBLIC">🔓 Открытая — игроки вступают мгновенно</option>
          <option value="PRIVATE">🔒 Закрытая — капитан одобряет заявки</option>
        </select>
      </Field>
      <Field label="Описание">
        <textarea
          name="description"
          rows={4}
          maxLength={500}
          defaultValue={team.description ?? ""}
          className={`${inputCls} resize-none h-auto`}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all"
      >
        {pending ? "Сохранение..." : "Сохранить"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
