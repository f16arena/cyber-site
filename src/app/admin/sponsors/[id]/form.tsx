"use client";

import { useActionState } from "react";
import { adminUpdateSponsor, type ActionState } from "../../actions";

const initial: ActionState = {};

export function SponsorAdminForm({
  sponsor,
}: {
  sponsor: {
    id: string;
    name: string;
    tier: string;
    websiteUrl: string | null;
    monthlyFeeKzt: number | null;
    notes: string | null;
  };
}) {
  const [state, action, pending] = useActionState(adminUpdateSponsor, initial);
  return (
    <form
      action={action}
      className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-4"
    >
      <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400">
        Данные
      </h2>
      <input type="hidden" name="id" value={sponsor.id} />
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
          {state.error}
        </div>
      )}
      <Field label="Название бренда">
        <input
          name="name"
          required
          defaultValue={sponsor.name}
          className={inputCls}
        />
      </Field>
      <Field label="Тир">
        <select name="tier" defaultValue={sponsor.tier} className={inputCls}>
          <option value="BRONZE">Бронза</option>
          <option value="SILVER">Серебро</option>
          <option value="GOLD">Золото</option>
          <option value="PLATINUM">Платина</option>
        </select>
      </Field>
      <Field label="Сайт">
        <input
          name="websiteUrl"
          type="url"
          defaultValue={sponsor.websiteUrl ?? ""}
          className={inputCls}
        />
      </Field>
      <Field label="Ежемесячный платёж (₸)">
        <input
          name="monthlyFeeKzt"
          type="number"
          min={0}
          step={1000}
          defaultValue={sponsor.monthlyFeeKzt ?? ""}
          className={inputCls}
        />
      </Field>
      <Field label="Заметки">
        <textarea
          name="notes"
          defaultValue={sponsor.notes ?? ""}
          rows={3}
          maxLength={500}
          className={`${inputCls} resize-none h-auto`}
        />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="h-10 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50"
      >
        {pending ? "..." : "Сохранить"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-10 px-3 text-sm focus:outline-none focus:border-violet-400";

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
