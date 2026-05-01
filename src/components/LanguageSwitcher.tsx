"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTransition } from "react";

const LOCALES = [
  { code: "ru", flag: "🇷🇺", label: "RU" },
  { code: "kk", flag: "🇰🇿", label: "KZ" },
  { code: "en", flag: "🇬🇧", label: "EN" },
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
    <div className="flex gap-0.5 border border-zinc-800 rounded overflow-hidden">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => switchLocale(l.code)}
          disabled={pending}
          className={`px-2 py-1 text-[10px] font-mono font-bold transition-colors ${
            currentLocale === l.code
              ? "bg-violet-500/20 text-violet-200"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
          }`}
          title={l.label}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
