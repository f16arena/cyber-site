import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ru", "kk", "en"],
  defaultLocale: "ru",
  localePrefix: "as-needed", // /ru → /, /kk → /kk, /en → /en
});

export type Locale = (typeof routing.locales)[number];
