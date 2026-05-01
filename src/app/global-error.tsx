"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error-reporter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, scope: "global" });
  }, [error]);

  return (
    <html lang="ru">
      <body className="bg-zinc-950 text-zinc-200 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-rose-400 mb-3">
            // Critical error
          </p>
          <h1 className="text-3xl font-black tracking-tight mb-3">
            Что-то сломалось
          </h1>
          <p className="text-zinc-400 mb-6 text-sm">
            Сайт временно не отвечает. Попробуй обновить страницу.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-zinc-600 mb-6">
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500"
          >
            Попробовать снова
          </button>
        </div>
      </body>
    </html>
  );
}
