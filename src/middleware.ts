import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Применяем middleware ко всем маршрутам кроме API, статики и админки
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
