"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Простые controlled-вкладки в стиле HLTV (нижний underline).
 *
 * <Tabs value={tab} onValueChange={setTab}>
 *   <TabsList>
 *     <TabsTrigger value="overview">Overview</TabsTrigger>
 *     <TabsTrigger value="bracket">Bracket</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="overview">...</TabsContent>
 * </Tabs>
 */

type TabsContext = {
  value: string;
  setValue: (v: string) => void;
};

const Ctx = React.createContext<TabsContext | null>(null);

function useTabs(): TabsContext {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>");
  return ctx;
}

export interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const ctx = React.useMemo(
    () => ({ value, setValue: onValueChange }),
    [value, onValueChange]
  );
  return (
    <Ctx.Provider value={ctx}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 border-b border-border-default overflow-x-auto",
        className
      )}
      {...rest}
    />
  );
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  children,
  ...rest
}: TabsTriggerProps) {
  const { value: active, setValue } = useTabs();
  const isActive = active === value;
  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => setValue(value)}
      className={cn(
        "px-3 h-9 text-sm font-medium whitespace-nowrap",
        "border-b-2 -mb-px transition-colors",
        isActive
          ? "border-cyan-400 text-cyan-300"
          : "border-transparent text-text-secondary hover:text-text-primary",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({
  value,
  className,
  ...rest
}: TabsContentProps) {
  const { value: active } = useTabs();
  if (active !== value) return null;
  return (
    <div role="tabpanel" className={cn("pt-4", className)} {...rest} />
  );
}
