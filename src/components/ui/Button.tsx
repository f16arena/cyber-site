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
    "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold disabled:bg-cyan-500/40 disabled:text-slate-950/60",
  secondary:
    "bg-bg-elevated hover:bg-slate-800 text-text-primary border border-border-default disabled:bg-bg-panel disabled:text-text-muted",
  ghost:
    "bg-transparent hover:bg-bg-elevated text-text-secondary hover:text-text-primary",
  destructive:
    "bg-rose-500 hover:bg-rose-400 text-white font-semibold disabled:bg-rose-500/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-sm",
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
          "inline-flex items-center justify-center gap-1.5 rounded font-medium",
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
