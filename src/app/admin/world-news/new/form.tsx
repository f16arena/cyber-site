"use client";

import { useActionState } from "react";
import { createWorldNews, type ActionState } from "../../actions";

const initial: ActionState = {};

export function WorldNewsForm() {
  const [state, action, pending] = useActionState(createWorldNews, initial);

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      {state.error && (
        <div className="rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
          {state.error}
        </div>
      )}

      <Field label="Заголовок (на оригинальном языке)">
        <input name="title" required minLength={3} maxLength={200} className={inputCls} />
      </Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Игра">
          <select name="game" defaultValue="" className={inputCls}>
            <option value="">— все —</option>
            <option value="CS2">CS2</option>
            <option value="DOTA2">Dota 2</option>
            <option value="PUBG">PUBG</option>
          </select>
        </Field>
        <Field label="Категория">
          <select name="category" defaultValue="GENERAL" className={inputCls}>
            <option value="TRANSFER">Трансфер</option>
            <option value="TOURNAMENT_RESULT">Результат турнира</option>
            <option value="ROSTER_CHANGE">Изменение состава</option>
            <option value="ANNOUNCEMENT">Анонс</option>
            <option value="GENERAL">Общее</option>
          </select>
        </Field>
        <Field label="Язык оригинала">
          <select name="originalLang" defaultValue="en" className={inputCls}>
            <option value="ru">Русский</option>
            <option value="kk">Қазақша</option>
            <option value="en">English</option>
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Источник (например, HLTV)">
          <input name="sourceName" maxLength={64} className={inputCls} />
        </Field>
        <Field label="URL источника">
          <input name="sourceUrl" type="url" className={inputCls} />
        </Field>
      </div>

      <Field label="URL изображения (опционально)">
        <input name="imageUrl" type="url" className={inputCls} placeholder="https://..." />
      </Field>

      <Field label="Или загрузи файл (приоритетнее URL)">
        <input
          type="file"
          name="cover"
          accept="image/png,image/jpeg,image/webp"
          className="text-sm text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-violet-500/15 file:text-violet-200 file:px-3 file:py-2 file:font-mono file:text-xs file:uppercase file:tracking-wider hover:file:bg-violet-500/25 file:cursor-pointer"
        />
        <span className="text-[11px] text-zinc-500 font-mono">
          PNG/JPG/WebP до 1 МБ. 16:9 (1280×720).
        </span>
      </Field>

      <Field label="Краткое описание (excerpt)">
        <textarea
          name="excerpt"
          rows={2}
          maxLength={300}
          className={`${inputCls} resize-none h-auto`}
        />
      </Field>

      <Field label="Текст новости">
        <textarea
          name="body"
          required
          minLength={10}
          rows={10}
          className={`${inputCls} resize-none h-auto`}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm py-2">
        <input
          type="checkbox"
          name="autoTranslate"
          defaultChecked
          className="w-4 h-4 mt-0.5"
        />
        <span>
          🌐 Автоматический перевод на 3 языка
          <span className="block text-xs text-zinc-500 mt-0.5">
            Требуется DEEPL_API_KEY в env. Если не настроен, на всех языках
            будет показан оригинал. Можешь оставить пустым и заполнить
            переводы вручную позже (через прямое редактирование БД).
          </span>
        </span>
      </label>

      <div className="flex gap-3 pt-3 border-t border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50"
        >
          {pending ? "Публикация..." : "Опубликовать"}
        </button>
        <a
          href="/admin/world-news"
          className="h-11 px-6 inline-flex items-center rounded font-bold text-xs uppercase tracking-wider border border-zinc-700 hover:border-zinc-500"
        >
          Отмена
        </a>
      </div>
    </form>
  );
}

const inputCls =
  "w-full bg-zinc-900/60 border border-zinc-700 rounded h-11 px-4 text-sm focus:outline-none focus:border-violet-400";

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
