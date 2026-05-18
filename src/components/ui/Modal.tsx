"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** Tailwind max-width class, e.g. "max-w-lg". По умолчанию max-w-lg. */
  maxWidthClass?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-lg",
  closeOnBackdrop = true,
  closeOnEscape = true,
  footer,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-bg-base/80 backdrop-blur-sm"
      )}
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "w-full mx-4 bg-bg-panel border border-border-default rounded shadow-2xl",
          maxWidthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-text-primary">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="text-text-muted hover:text-text-primary text-lg leading-none w-6 h-6 flex items-center justify-center rounded hover:bg-bg-elevated"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-4 py-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-border-default flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
