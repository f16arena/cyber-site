"use client";

import { useState, useTransition } from "react";
import { adminLoginAction } from "./actions";

const ERROR_LABELS: Record<string, string> = {
  missing_fields: "Заполните логин и пароль",
  invalid_credentials: "Неверный логин или пароль",
  too_many_attempts: "Слишком много попыток. Подождите 5 минут.",
  db_not_migrated:
    "БД ещё не синхронизирована (нет таблицы AdminCredential). Дождитесь следующего деплоя Vercel — build применит миграции автоматически.",
};

export function AdminLoginForm({ to }: { to?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await adminLoginAction(formData);
        // Если оказались тут — значит redirect не выполнился, это ошибка
        if (!res.ok) {
          setError(ERROR_LABELS[res.error] ?? res.error);
        }
      } catch (e) {
        // redirect() бросает NEXT_REDIRECT — это норма, ничего не делаем
        const msg = (e as Error).message;
        if (!msg.includes("NEXT_REDIRECT")) {
          setError(msg);
        }
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-3">
      {to && <input type="hidden" name="to" value={to} />}
      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Логин
        </span>
        <input
          name="login"
          autoComplete="username"
          required
          autoFocus
          className="mt-1 w-full h-11 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm focus:border-violet-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Пароль
        </span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full h-11 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm font-mono focus:border-violet-500 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded font-bold bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all"
      >
        {pending ? "..." : "Войти"}
      </button>
      {error && (
        <div className="text-sm text-rose-300 font-mono text-center">
          {error}
        </div>
      )}
    </form>
  );
}
