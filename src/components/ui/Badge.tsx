import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "default"
  | "live"
  | "win"
  | "loss"
  | "upcoming"
  | "finished"
  | "yellow"
  | "blue";

type Size = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  default:
    "bg-bg-elevated text-text-secondary border-border-default",
  live:
    "bg-rose-500/12 text-rose-300 border-rose-500/40",
  win:
    "bg-emerald-500/12 text-emerald-300 border-emerald-500/40",
  loss:
    "bg-rose-500/12 text-rose-300 border-rose-500/40",
  upcoming:
    "bg-brand-yellow/12 text-brand-yellow border-brand-yellow/40",
  finished:
    "bg-bg-elevated text-text-muted border-border-default",
  yellow:
    "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/40",
  blue:
    "bg-brand-blue/15 text-brand-blue border-brand-blue/40",
};

const SIZES: Record<Size, string> = {
  sm: "text-[9px] px-1.5 h-[18px]",
  md: "text-[10px] px-2 h-[20px]",
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
        "inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wider",
        "rounded-sm border whitespace-nowrap leading-none",
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
