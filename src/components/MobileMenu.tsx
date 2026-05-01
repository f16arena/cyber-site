"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MobileMenu({
  links,
}: {
  links: Array<{ href: string; label: string }>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const stripLocale = (p: string) => p.replace(/^\/(ru|kk|en)(?=\/|$)/, "") || "/";
  const currentPath = stripLocale(pathname || "/");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden text-zinc-300 hover:text-violet-300 px-2 h-9 inline-flex items-center"
        aria-label="Меню"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <nav
          className={`absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-zinc-950 border-l border-violet-500/20 p-6 flex flex-col gap-1 overflow-y-auto transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
              // Меню
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-rose-300 text-2xl leading-none w-8 h-8 inline-flex items-center justify-center"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>
          {links.map((l) => {
            const active =
              currentPath === l.href ||
              (l.href !== "/" && currentPath.startsWith(l.href + "/"));
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-3 rounded text-base font-medium border transition-colors ${
                  active
                    ? "bg-violet-500/15 text-violet-200 border-violet-500/40"
                    : "text-zinc-200 hover:bg-violet-500/10 hover:text-violet-300 border-transparent hover:border-violet-500/30"
                }`}
              >
                {l.label}
              </Link>
            );
          })}

          <div className="mt-auto pt-6 border-t border-zinc-800/60">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
              esports.kz
            </p>
          </div>
        </nav>
      </div>
    </>
  );
}
