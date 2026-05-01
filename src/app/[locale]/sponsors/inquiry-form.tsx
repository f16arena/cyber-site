"use client";

import { useActionState } from "react";
import { submitSponsorshipInquiry, type InquiryState } from "./actions";

const initial: InquiryState = {};

const TIER_OPTIONS = [
  { value: "", label: "— выбери тир —" },
  { value: "BRONZE", label: "Бронза — от 50 000 ₸" },
  { value: "SILVER", label: "Серебро — от 200 000 ₸" },
  { value: "GOLD", label: "Золото — от 500 000 ₸" },
  { value: "PLATINUM", label: "Платина — по запросу" },
  { value: "", label: "Не определились — нужна консультация" },
];

export function InquiryForm() {
  const [state, action, pending] = useActionState(
    submitSponsorshipInquiry,
    initial
  );

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-8 text-center">
        <div className="text-4xl mb-3">✓</div>
        <h3 className="text-2xl font-display font-black mb-2">
          Заявка получена!
        </h3>
        <p className="text-emerald-200">
          Мы свяжемся с тобой в течение 24 часов с персональным предложением.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid sm:grid-cols-2 gap-4">
      {state.error && (
        <div className="sm:col-span-2 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300 p-3 text-sm">
          {state.error}
        </div>
      )}
      <input
        type="text"
        name="companyName"
        placeholder="Название компании"
        required
        minLength={2}
        className={inputCls}
      />
      <input
        type="text"
        name="contactName"
        placeholder="Контактное лицо"
        required
        minLength={2}
        className={inputCls}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        className={inputCls}
      />
      <input
        type="tel"
        name="phone"
        placeholder="Телефон / Telegram"
        className={inputCls}
      />
      <select
        name="tier"
        defaultValue=""
        className={`${inputCls} sm:col-span-2`}
      >
        {TIER_OPTIONS.map((t, i) => (
          <option key={i} value={t.value} disabled={i === 0}>
            {t.label}
          </option>
        ))}
      </select>
      <textarea
        name="message"
        placeholder="Расскажите кратко о ваших целях"
        rows={4}
        maxLength={2000}
        className={`${inputCls} sm:col-span-2 resize-none`}
      />
      <button
        type="submit"
        disabled={pending}
        className="sm:col-span-2 h-12 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all glow-violet clip-corner"
      >
        {pending ? "Отправка..." : "Отправить заявку →"}
      </button>
    </form>
  );
}

const inputCls =
  "bg-zinc-900/60 border border-zinc-700 rounded h-12 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors";
