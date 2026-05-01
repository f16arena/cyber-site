import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Применяем middleware ко всем маршрутам кроме API, админки, _next и
  // настоящих статических ассетов (с конкретными расширениями).
  // ВАЖНО: исключаем только реальные file extensions — иначе username/slug
  // с точкой (например serega.magomedov.1995) ломается.
  matcher: [
    "/((?!api|admin|_next|_vercel|.*\\.(?:css|js|map|json|png|jpg|jpeg|webp|svg|ico|gif|woff|woff2|ttf|otf|mp4|webm|pdf)$).*)",
  ],
};
