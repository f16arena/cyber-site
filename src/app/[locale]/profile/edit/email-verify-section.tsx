"use client";

import { useActionState } from "react";
import { requestEmailVerification } from "./actions";
import type { ProfileFormState } from "./actions";
import { Button } from "@/components/ui/Button";

const initialState: ProfileFormState = {};

export function EmailVerifySection({
  currentEmail,
  emailVerifiedAt,
}: {
  currentEmail: string | null;
  emailVerifiedAt: Date | null;
}) {
  const [state, action, pending] = useActionState(
    requestEmailVerification,
    initialState
  );

  const verified = !!emailVerifiedAt && !!currentEmail;

  return (
    <section className="rounded border border-border-default bg-bg-panel p-4 mb-5">
      <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
        Email · уведомления
      </h2>

      {verified && (
        <div className="mb-3 text-[13px]">
          <span className="text-emerald-300">✓ Email подтверждён:</span>{" "}
          <span className="font-mono text-text-primary">{currentEmail}</span>
        </div>
      )}

      {!verified && currentEmail && (
        <div className="mb-3 text-[13px] text-amber-300">
          ⚠ Email <span className="font-mono">{currentEmail}</span> сохранён,
          но не подтверждён. Запроси письмо ещё раз.
        </div>
      )}

      <form action={action} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 flex-1 min-w-[240px]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            {verified ? "Изменить email" : "Email"}
          </span>
          <input
            type="email"
            name="email"
            required
            defaultValue={currentEmail ?? ""}
            placeholder="you@example.com"
            className="bg-bg-elevated border border-border-default rounded-sm h-8 px-2.5 text-[13px] focus:outline-none focus:border-brand-yellow"
          />
        </label>
        <Button type="submit" size="md" loading={pending}>
          {verified ? "Сменить" : "Отправить письмо"}
        </Button>
      </form>

      {state.ok && (
        <p className="mt-2 text-[12px] text-emerald-300">
          ✓ Письмо отправлено. Перейди по ссылке в письме для подтверждения.
        </p>
      )}
      {state.error && (
        <p className="mt-2 text-[12px] text-rose-300">{state.error}</p>
      )}

      <p className="mt-3 text-[11px] text-text-muted">
        Email используется только для уведомлений (приглашения в команду,
        результаты матчей, MVP). Не публикуется в профиле.
      </p>
    </section>
  );
}
