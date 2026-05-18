import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-yellow hover:bg-brand-yellow-hover text-text-on-yellow font-bold disabled:bg-brand-yellow/40 disabled:text-text-on-yellow/60",
  secondary:
    "bg-bg-elevated hover:bg-bg-panel text-text-primary border border-border-default hover:border-border-strong disabled:bg-bg-panel disabled:text-text-muted",
  ghost:
    "bg-transparent hover:bg-bg-elevated text-text-secondary hover:text-text-primary",
  destructive:
    "bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:bg-rose-600/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-6 px-2 text-[11px]",
  md: "h-8 px-3 text-[12px]",
  lg: "h-10 px-5 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...rest
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={rest.type ?? "button"}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-sm uppercase tracking-wide",
          "disabled:cursor-not-allowed",
          VARIANTS[variant],
          SIZES[size],
          fullWidth && "w-full",
          className
        )}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden
            className="w-3 h-3 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);
