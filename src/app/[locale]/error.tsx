"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error-reporter";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, scope: "locale" });
  }, [error]);

  return (
    <main className="flex-1 mx-auto max-w-xl w-full px-6 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-rose-400 mb-3">
        // Что-то пошло не так
      </p>
      <h1 className="text-3xl font-display font-black tracking-tight mb-3">
        Ошибка загрузки
      </h1>
      <p className="text-zinc-400 mb-6 text-sm">
        Не удалось показать страницу. Попробуй ещё раз — возможно, временный
        сбой соединения с базой.
      </p>
      {error.digest && (
        <p className="text-xs font-mono text-zinc-600 mb-6">
          ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500"
        >
          Перезагрузить
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider border border-zinc-700 hover:border-zinc-500"
        >
          На главную
        </a>
      </div>
    </main>
  );
}
