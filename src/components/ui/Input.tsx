import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      label,
      error,
      hint,
      startIcon,
      endIcon,
      className,
      id,
      disabled,
      ...rest
    },
    ref
  ) {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-medium uppercase tracking-wide text-text-secondary"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            "relative flex items-center rounded-sm border bg-bg-elevated transition-colors",
            error
              ? "border-rose-500/60 focus-within:border-rose-400"
              : "border-border-default focus-within:border-brand-yellow",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          {startIcon && (
            <span className="pl-2 text-text-muted flex items-center">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              "flex-1 h-8 px-2.5 bg-transparent text-[13px] text-text-primary",
              "placeholder:text-text-muted",
              "focus:outline-none disabled:cursor-not-allowed",
              startIcon ? "pl-1.5" : "",
              endIcon ? "pr-1.5" : "",
              className
            )}
            {...rest}
          />
          {endIcon && (
            <span className="pr-2 text-text-muted flex items-center">
              {endIcon}
            </span>
          )}
        </div>
        {error ? (
          <p className="text-[11px] text-rose-400">{error}</p>
        ) : hint ? (
          <p className="text-[11px] text-text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);
