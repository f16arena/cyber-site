import * as React from "react";
import { cn } from "@/lib/cn";

type Padding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  hover?: boolean;
  borderless?: boolean;
}

const PADDINGS: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = "md", hover = false, borderless = false, className, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded bg-bg-panel",
        !borderless && "border border-border-default",
        hover && "hover:bg-bg-elevated hover:border-border-strong",
        PADDINGS[padding],
        className
      )}
      {...rest}
    />
  );
});

export function CardHeader({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between mb-3 pb-2 border-b border-border-default",
        className
      )}
      {...rest}
    />
  );
}

export function CardTitle({
  className,
  as: As = "h3",
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <As
      className={cn(
        "text-xs font-mono uppercase tracking-widest text-text-muted",
        className
      )}
      {...rest}
    />
  );
}
