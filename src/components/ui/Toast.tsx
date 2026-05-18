"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

type ToastContextValue = {
  show: (toast: Omit<ToastItem, "id">) => string;
  dismiss: (id: string) => void;
};

const Ctx = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast() must be used inside <ToastProvider>");
  return ctx;
}

const VARIANTS: Record<ToastVariant, string> = {
  default: "border-border-strong bg-bg-elevated",
  success: "border-emerald-500/40 bg-emerald-500/10",
  error: "border-rose-500/40 bg-rose-500/10",
  info: "border-cyan-500/40 bg-cyan-500/10",
};

const ICONS: Record<ToastVariant, string> = {
  default: "·",
  success: "✓",
  error: "!",
  info: "i",
};

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback(
    (input: Omit<ToastItem, "id">) => {
      const id = `t${++nextId}`;
      const item: ToastItem = { id, ...input };
      setItems((prev) => [...prev, item]);
      const duration = input.durationMs ?? 4000;
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss]
  );

  const ctx = React.useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {items.map((t) => {
              const v = t.variant ?? "default";
              return (
                <div
                  key={t.id}
                  role="status"
                  className={cn(
                    "pointer-events-auto",
                    "min-w-[260px] max-w-sm rounded border px-3 py-2.5",
                    "shadow-xl flex items-start gap-2.5",
                    "animate-in-toast",
                    VARIANTS[v]
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      v === "success" && "bg-emerald-500/30 text-emerald-200",
                      v === "error" && "bg-rose-500/30 text-rose-200",
                      v === "info" && "bg-cyan-500/30 text-cyan-200",
                      v === "default" && "bg-slate-700 text-text-secondary"
                    )}
                  >
                    {ICONS[v]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Закрыть"
                    className="text-text-muted hover:text-text-primary text-base leading-none -mt-0.5"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </Ctx.Provider>
  );
}
