"use client";

import { useActionState } from "react";
import { createNews, type ActionState } from "../../actions";

const initialState: ActionState = {};

export function NewsCreateForm() {
  const [state, action, pending] = useActionState(createNews, initialState);
  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 p-4 text-sm">
          {state.error}
        </div>
      )}

      <Field label="Заголовок">
        <input
          name="title"
          required
          minLength={3}
          maxLength={200}
          className={inputCls}
          placeholder="Tulpar выигрывает первый этап весеннего сезона"
        />
      </Field>

      <Field label="Slug (URL)">
        <input
          name="slug"
          required
          pattern="[a-z0-9-]{3,80}"
          className={`${inputCls} lowercase`}
          placeholder="tulpar-wins-spring-stage-1"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Категория">
          <select name="category" defaultValue="GENERAL" className={inputCls}>
            <option value="TOURNAMENT">Турнир</option>
            <option value="MVP">MVP</option>
            <option value="SPONSOR">Спонсоры</option>
            <option value="TEAM">Команда</option>
            <option value="GENERAL">Общее</option>
          </select>
        </Field>
        <Field label="Игра (опционально)">
          <select name="game" defaultValue="" className={inputCls}>
            <option value="">— все —</option>
            <option value="CS2">CS2</option>
            <option value="DOTA2">Dota 2</option>
            <option value="PUBG">PUBG</option>
          </select>
        </Field>
      </div>

      <Field label="Краткое описание (excerpt)">
        <textarea
          name="excerpt"
          rows={2}
          maxLength={300}
          className={`${inputCls} resize-none h-auto`}
          placeholder="Команда из Алматы прошла без поражений. MVP турнира — k1ller_kz."
        />
      </Field>

      <Field label="Текст новости">
        <textarea
          name="body"
          required
          minLength={10}
          rows={10}
          className={`${inputCls} resize-none h-auto font-mono`}
          placeholder="Полный текст..."
        />
      </Field>

      <Field label="Обложка (необязательно)">
        <input
          type="file"
          name="cover"
          accept="image/png,image/jpeg,image/webp"
          className="text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-violet-500/15 file:text-violet-200 file:px-3 file:py-2 file:font-mono file:text-xs file:uppercase file:tracking-wider hover:file:bg-violet-500/25 file:cursor-pointer"
        />
        <span className="text-[11px] text-zinc-500 font-mono">
          PNG/JPG/WebP до 1 МБ. Лучше 16:9 (1280×720).
        </span>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="publishNow"
          defaultChecked
          className="w-4 h-4"
        />
        Опубликовать сразу
      </label>

      <div className="flex gap-3 pt-4 border-t border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all clip-corner"
        >
          {pending ? "Сохранение..." : "Сохранить"}
        </button>
        <a
          href="/admin/news"
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
