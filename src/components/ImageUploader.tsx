"use client";

import { useRef, useState, useTransition } from "react";

type Props = {
  currentUrl: string | null;
  /** Server action which accepts FormData with field "file" */
  action: (formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
  /** Дополнительные hidden поля (id команды и т.п.) */
  extraFields?: Record<string, string>;
  /** Reset action — например, "вернуть аватарку Steam" */
  resetAction?: () => Promise<{ ok?: boolean; error?: string }>;
  resetLabel?: string;
  shape?: "square" | "circle";
  label?: string;
  hint?: string;
};

export function ImageUploader({
  currentUrl,
  action,
  extraFields,
  resetAction,
  resetLabel,
  shape = "square",
  label = "Изображение",
  hint = "PNG / JPG / WebP. Максимум 1 МБ. Рекомендуемый размер 256×256.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Локальная валидация
    if (file.size > 1024 * 1024) {
      setError(`Файл ${(file.size / 1024).toFixed(0)} КБ — больше 1 МБ`);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setError("Только PNG / JPG / WebP / GIF");
      return;
    }

    setPreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append("file", file);
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) fd.append(k, v);
    }

    startTransition(async () => {
      const result = await action(fd);
      if (result.error) {
        setError(result.error);
        setPreview(null);
      }
    });
  }

  function onReset() {
    if (!resetAction) return;
    setError(null);
    setPreview(null);
    startTransition(async () => {
      const result = await resetAction();
      if (result.error) setError(result.error);
    });
  }

  const displayUrl = preview || currentUrl;
  const round = shape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div className="flex items-center gap-4">
      <div
        className={`relative w-24 h-24 ${round} border border-zinc-700 bg-zinc-900 overflow-hidden flex-shrink-0`}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt="preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-mono">
            No image
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs font-mono text-violet-300">
            Загрузка...
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
          {label}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onFileChange}
          className="hidden"
        />
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="text-xs font-mono px-3 h-9 rounded border border-violet-500/30 hover:bg-violet-500/10 text-violet-300 disabled:opacity-50 transition-all"
          >
            📁 Выбрать файл
          </button>
          {resetAction && (
            <button
              type="button"
              onClick={onReset}
              disabled={pending}
              className="text-xs font-mono px-3 h-9 rounded border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 transition-all"
            >
              {resetLabel || "Сбросить"}
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-400">{error}</p>
        ) : (
          <p className="text-xs text-zinc-500">{hint}</p>
        )}
      </div>
    </div>
  );
}
