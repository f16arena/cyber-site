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
            className="text-xs font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            "relative flex items-center rounded border bg-bg-elevated transition-colors",
            error
              ? "border-rose-500/60 focus-within:border-rose-400"
              : "border-border-default focus-within:border-cyan-500",
            disabled && "opacity-60 cursor-not-allowed"
          )}
        >
          {startIcon && (
            <span className="pl-2.5 text-text-muted flex items-center">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              "flex-1 h-9 px-3 bg-transparent text-sm text-text-primary",
              "placeholder:text-text-muted",
              "focus:outline-none disabled:cursor-not-allowed",
              startIcon ? "pl-2" : "",
              endIcon ? "pr-2" : "",
              className
            )}
            {...rest}
          />
          {endIcon && (
            <span className="pr-2.5 text-text-muted flex items-center">
              {endIcon}
            </span>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-400 mt-0.5">{error}</p>
        ) : hint ? (
          <p className="text-xs text-text-muted mt-0.5">{hint}</p>
        ) : null}
      </div>
    );
  }
);
