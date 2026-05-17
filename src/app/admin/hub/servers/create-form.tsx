"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHubServer } from "./actions";

const ERROR_LABELS: Record<string, string> = {
  name_required: "Введите название сервера",
  ip_invalid: "Неверный IP/hostname",
  port_invalid: "Порт должен быть 1..65535",
  rcon_too_short: "RCON-пароль слишком короткий",
  ip_port_exists: "Сервер с таким ip:port уже есть",
};

export function CreateServerForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await createHubServer(formData);
      if (res.ok) {
        router.refresh();
        (document.getElementById("hub-server-form") as HTMLFormElement | null)?.reset();
      } else {
        setError(ERROR_LABELS[res.error] ?? res.error);
      }
    });
  };

  return (
    <form id="hub-server-form" action={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Название
          </span>
          <input
            name="name"
            placeholder="kz-local-1"
            required
            className="mt-1 w-full h-10 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm focus:border-violet-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            IP / hostname
          </span>
          <input
            name="ip"
            placeholder="127.0.0.1"
            required
            className="mt-1 w-full h-10 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm font-mono focus:border-violet-500 focus:outline-none"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            Порт
          </span>
          <input
            name="port"
            type="number"
            min={1}
            max={65535}
            placeholder="27015"
            defaultValue={27015}
            required
            className="mt-1 w-full h-10 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm font-mono focus:border-violet-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            RCON password
          </span>
          <input
            name="rconPassword"
            type="password"
            required
            minLength={4}
            autoComplete="new-password"
            className="mt-1 w-full h-10 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm font-mono focus:border-violet-500 focus:outline-none"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Заметки (опционально)
        </span>
        <input
          name="notes"
          className="mt-1 w-full h-10 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm focus:border-violet-500 focus:outline-none"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-4 rounded bg-violet-500/20 border border-violet-500/40 text-violet-100 hover:bg-violet-500/30 disabled:opacity-50 text-sm font-bold transition-colors"
        >
          {pending ? "Сохраняем..." : "Добавить сервер"}
        </button>
        {error && (
          <span className="text-xs text-rose-300 font-mono">{error}</span>
        )}
      </div>
    </form>
  );
}
