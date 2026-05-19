"use client";

import { useActionState } from "react";
import { createGameServer, type ServerFormState } from "../actions";
import { Button } from "@/components/ui/Button";

const initialState: ServerFormState = {};

const inputCls =
  "w-full bg-bg-elevated border border-border-default rounded-sm h-9 px-3 text-[13px] text-text-primary focus:outline-none focus:border-brand-yellow transition-colors";

const labelCls =
  "text-[10px] font-mono uppercase tracking-wider text-text-muted";

export function ServerCreateForm() {
  const [state, action, pending] = useActionState(
    createGameServer,
    initialState
  );

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <div className="rounded-sm border border-rose-500/40 bg-rose-500/10 text-rose-300 p-3 text-[13px]">
          {state.error}
        </div>
      )}

      <Field label="Название" hint="как ты называешь сервер для себя">
        <input
          name="name"
          required
          minLength={2}
          maxLength={40}
          className={inputCls}
          placeholder="Home CS2 #1"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field
          label="LAN-IP"
          hint="адрес видный игрокам в клубе"
        >
          <input
            name="ip"
            required
            className={`${inputCls} font-mono`}
            placeholder="192.168.1.100"
          />
        </Field>
        <Field label="Port (game UDP)">
          <input
            name="port"
            type="number"
            min={1}
            max={65535}
            defaultValue={27015}
            required
            className={inputCls}
          />
        </Field>
        <Field label="RCON port (TCP)">
          <input
            name="rconPort"
            type="number"
            min={1}
            max={65535}
            defaultValue={27015}
            required
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label="RCON-пароль"
        hint="тот что в server.cfg → rcon_password. Хранится зашифрованным."
      >
        <input
          name="rconPassword"
          type="password"
          required
          minLength={6}
          maxLength={100}
          className={`${inputCls} font-mono`}
          placeholder="•••••••••••••"
        />
      </Field>

      <Field label="Заметки (опционально)">
        <textarea
          name="notes"
          rows={3}
          maxLength={500}
          className={`${inputCls} h-auto py-2 resize-none`}
          placeholder="Например: i5-10400, RTX 1660, основной для турниров"
        />
      </Field>

      <div className="flex gap-2 pt-3 border-t border-border-default">
        <Button type="submit" size="md" loading={pending}>
          Сохранить
        </Button>
        <a href="/admin/servers">
          <Button type="button" variant="secondary" size="md">
            Отмена
          </Button>
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && (
        <span className="text-[11px] text-text-muted leading-snug">{hint}</span>
      )}
    </label>
  );
}
