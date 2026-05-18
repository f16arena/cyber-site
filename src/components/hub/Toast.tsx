"use client";

import { useEffect, useState, useCallback } from "react";

export type ToastKind = "info" | "success" | "error";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

let counter = 0;

/**
 * Простой хук для toast-уведомлений без зависимостей. Использует
 * локальный стейт + Portal-друг по соглашению — рендерится
 * через возвращаемый <ToastContainer/>.
 *
 * Пример:
 *   const { toast, ToastContainer } = useToast();
 *   ...
 *   toast("Ссылка скопирована", "success");
 *   return <><div>...</div><ToastContainer/></>;
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(
    () => <ToastView toasts={toasts} onDismiss={dismiss} />,
    [toasts, dismiss]
  );

  return { toast, ToastContainer };
}

function ToastView({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur-sm transition-all animate-[slide-in_0.2s_ease-out] ${
            t.kind === "success"
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
              : t.kind === "error"
              ? "border-rose-500/40 bg-rose-500/15 text-rose-100"
              : "border-orange-500/40 bg-orange-500/15 text-orange-100"
          }`}
        >
          {t.message}
        </button>
      ))}
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
