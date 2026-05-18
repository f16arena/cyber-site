import * as React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Если true — выводится компактно (для пустых секций), иначе крупно. */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded border border-dashed border-border-default bg-bg-panel/50",
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-6" : "px-6 py-12",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "text-text-muted mb-3",
            compact ? "text-2xl" : "text-4xl"
          )}
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          "font-semibold text-text-primary",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "text-text-secondary mt-1",
            compact ? "text-xs" : "text-sm max-w-md"
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
