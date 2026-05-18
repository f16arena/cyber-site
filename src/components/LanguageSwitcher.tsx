"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

const LOCALES = [
  { code: "ru", label: "RU" },
  { code: "kk", label: "KZ" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher() {
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchLocale(locale: "ru" | "kk" | "en") {
    if (locale === currentLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale });
    });
  }

  return (
    <div className="hidden sm:flex gap-0.5 border border-border-default rounded overflow-hidden">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => switchLocale(l.code)}
          disabled={pending}
          className={`px-2 h-8 text-[10px] font-mono font-bold transition-colors ${
            currentLocale === l.code
              ? "bg-cyan-500/15 text-cyan-300"
              : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
          }`}
          title={l.label}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
