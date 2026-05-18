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

  const stripLocale = (p: string) =>
    p.replace(/^\/(ru|kk|en)(?=\/|$)/, "") || "/";
  const currentPath = stripLocale(pathname || "/");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden text-text-secondary hover:text-cyan-300 px-2 h-8 inline-flex items-center"
        aria-label="Меню"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-bg-base/80 backdrop-blur-sm transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
        />
        <nav
          className={`absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-bg-panel border-l border-border-default p-6 flex flex-col gap-1 overflow-y-auto transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-mono uppercase tracking-widest text-text-muted">
              Меню
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-rose-300 text-xl leading-none w-8 h-8 inline-flex items-center justify-center"
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
                className={`px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? "bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary border-l-2 border-transparent"
                }`}
              >
                {l.label}
              </Link>
            );
          })}

          <div className="mt-auto pt-6 border-t border-border-default">
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
              F16 Arena
            </p>
          </div>
        </nav>
      </div>
    </>
  );
}
