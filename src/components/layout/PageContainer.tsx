import * as React from "react";
import { cn } from "@/lib/cn";

type MaxWidth = "default" | "wide" | "narrow" | "full";

const MAX_WIDTHS: Record<MaxWidth, string> = {
  default: "max-w-7xl",   // ~1280px — основной layout HLTV
  wide:    "max-w-[1440px]", // широкий layout (bracket, scoreboard)
  narrow:  "max-w-3xl",   // профили, формы
  full:    "max-w-none",  // на всю ширину
};

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: MaxWidth;
}

export function PageContainer({
  maxWidth = "default",
  className,
  ...rest
}: PageContainerProps) {
  return (
    <div
      className={cn("mx-auto px-4 sm:px-6", MAX_WIDTHS[maxWidth], className)}
      {...rest}
    />
  );
}

export function PageSection({
  className,
  ...rest
}: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("py-6", className)} {...rest} />;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        "py-6 border-b border-border-default mb-6",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
