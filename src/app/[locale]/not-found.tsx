import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-lg text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-violet-400 mb-3">
            // 404
          </p>
          <h1 className="text-6xl sm:text-7xl font-display font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
              GG WP
            </span>
          </h1>
          <p className="text-xl font-display font-bold text-zinc-300 mb-3">
            Страница не найдена
          </p>
          <p className="text-zinc-400 mb-8 text-sm">
            Может, её снесли с патчем. А может, ссылка кривая. Возвращайся на
            базу.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 clip-corner"
            >
              На главную
            </Link>
            <Link
              href="/tournaments"
              className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider border border-zinc-700 hover:border-violet-400 clip-corner"
            >
              Турниры
            </Link>
            <Link
              href="/players"
              className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-xs uppercase tracking-wider border border-zinc-700 hover:border-violet-400 clip-corner"
            >
              Игроки
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
