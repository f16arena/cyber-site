"use client";

import { useEffect, useState } from "react";

function diffParts(targetMs: number) {
  const ms = Math.max(0, targetMs - Date.now());
  const days = Math.floor(ms / 86400_000);
  const hours = Math.floor((ms % 86400_000) / 3600_000);
  const minutes = Math.floor((ms % 3600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return { days, hours, minutes, seconds, totalMs: ms };
}

export function Countdown({
  toIso,
  compact,
}: {
  toIso: string;
  compact?: boolean;
}) {
  const target = new Date(toIso).getTime();
  const [parts, setParts] = useState(() => diffParts(target));

  useEffect(() => {
    const id = setInterval(() => setParts(diffParts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (parts.totalMs <= 0) {
    return (
      <span className="font-mono text-xs text-rose-300 font-bold">
        🔴 НАЧАЛСЯ
      </span>
    );
  }

  if (compact) {
    if (parts.days > 0) {
      return (
        <span className="font-mono text-xs text-violet-200">
          {parts.days}д {parts.hours}ч
        </span>
      );
    }
    return (
      <span className="font-mono text-xs text-amber-300">
        {String(parts.hours).padStart(2, "0")}:
        {String(parts.minutes).padStart(2, "0")}:
        {String(parts.seconds).padStart(2, "0")}
      </span>
    );
  }

  const cells: Array<{ value: number; label: string }> = [
    { value: parts.days, label: "дн" },
    { value: parts.hours, label: "ч" },
    { value: parts.minutes, label: "мин" },
    { value: parts.seconds, label: "сек" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded border border-violet-500/30 bg-zinc-950/60 p-2 text-center"
        >
          <div className="text-2xl font-black font-mono text-violet-200">
            {String(c.value).padStart(2, "0")}
          </div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mt-0.5">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
