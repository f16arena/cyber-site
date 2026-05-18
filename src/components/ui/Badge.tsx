import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "default"
  | "live"
  | "win"
  | "loss"
  | "upcoming"
  | "finished"
  | "cyan"
  | "amber";

type Size = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  default:
    "bg-slate-800/70 text-text-secondary border-border-default",
  live:
    "bg-rose-500/15 text-rose-300 border-rose-500/40",
  win:
    "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  loss:
    "bg-rose-500/15 text-rose-300 border-rose-500/40",
  upcoming:
    "bg-amber-500/15 text-amber-300 border-amber-500/40",
  finished:
    "bg-slate-700/40 text-text-muted border-border-strong",
  cyan:
    "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  amber:
    "bg-amber-500/15 text-amber-300 border-amber-500/40",
};

const SIZES: Record<Size, string> = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-1",
};

export function Badge({
  variant = "default",
  size = "sm",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wide",
        "rounded border whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {variant === "live" && <span className="live-dot" aria-hidden />}
      {children}
    </span>
  );
}
