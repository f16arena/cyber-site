"use client";

import { useActionState } from "react";
import { createSponsor, type ActionState } from "../../actions";

const initial: ActionState = {};

export function SponsorForm() {
  const [state, action, pending] = useActionState(createSponsor, initial);
  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
          {state.error}
        </div>
      )}
      <Field label="Название бренда">
        <input name="name" required minLength={2} maxLength={80} className={inputCls} placeholder="Beeline KZ" />
      </Field>
      <Field label="Тир">
        <select name="tier" required defaultValue="" className={inputCls}>
          <option value="" disabled>— выбери —</option>
          <option value="BRONZE">Бронза</option>
          <option value="SILVER">Серебро</option>
          <option value="GOLD">Золото</option>
          <option value="PLATINUM">Платина</option>
        </select>
      </Field>
      <Field label="Сайт">
        <input name="websiteUrl" type="url" placeholder="https://beeline.kz" className={inputCls} />
      </Field>
      <Field label="URL логотипа">
        <input name="logoUrl" type="url" placeholder="https://..." className={inputCls} />
      </Field>
      <Field label="Ежемесячный платёж (₸)">
        <input name="monthlyFeeKzt" type="number" min={0} step={1000} className={inputCls} placeholder="200000" />
      </Field>
      <Field label="Заметки (видны только админам)">
        <textarea name="notes" rows={3} maxLength={500} className={`${inputCls} resize-none h-auto`} />
      </Field>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all">
          {pending ? "Сохранение..." : "Добавить"}
        </button>
        <a href="/admin/sponsors" className="h-11 px-6 inline-flex items-center rounded font-bold text-xs uppercase tracking-wider border border-zinc-700 hover:border-zinc-500">
          Отмена
        </a>
      </div>
    </form>
  );
}

const inputCls = "w-full bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
