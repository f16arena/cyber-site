import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * HLTV-style плотная таблица. Серверные примитивы без состояния.
 *
 * <Table>
 *   <Thead>
 *     <Tr><Th>Name</Th><Th align="right">Score</Th></Tr>
 *   </Thead>
 *   <Tbody>
 *     <Tr><Td>tulpar</Td><Td align="right">16</Td></Tr>
 *   </Tbody>
 * </Table>
 */

export function Table({
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded border border-border-default bg-bg-panel">
      <table
        className={cn("w-full text-sm tabular-nums", className)}
        {...rest}
      />
    </div>
  );
}

export function Thead({
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "bg-bg-elevated border-b border-border-default",
        "text-[11px] font-mono uppercase tracking-widest text-text-muted",
        className
      )}
      {...rest}
    />
  );
}

export function Tbody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={cn("[&>tr:nth-child(even)]:bg-bg-row-alt", className)}
      {...rest}
    />
  );
}

export function Tr({
  className,
  interactive = false,
  ...rest
}: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        "border-b border-border-default/50 last:border-b-0",
        interactive &&
          "hover:bg-bg-elevated cursor-pointer transition-colors",
        className
      )}
      {...rest}
    />
  );
}

type Align = "left" | "right" | "center";
const ALIGN: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function Th({
  className,
  align = "left",
  ...rest
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: Align }) {
  return (
    <th
      className={cn(
        "px-3 h-8 font-medium",
        ALIGN[align],
        className
      )}
      {...rest}
    />
  );
}

export function Td({
  className,
  align = "left",
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: Align }) {
  return (
    <td
      className={cn("px-3 h-9 text-text-primary", ALIGN[align], className)}
      {...rest}
    />
  );
}
