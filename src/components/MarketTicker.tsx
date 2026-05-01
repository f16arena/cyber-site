"use client";

import { useEffect, useState } from "react";

type SkinPrice = {
  name: string;
  shortName: string;
  priceUsd: number | null;
};

type MarketData = {
  currencies: {
    usdToKzt: number | null;
    usdToRub: number | null;
    usdToEur: number | null;
  };
  skins: SkinPrice[];
  updatedAt: string;
};

function fmt(n: number | null, decimals = 1): string {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function MarketTicker() {
  const [data, setData] = useState<MarketData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MarketData | null) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    // Skeleton — место зарезервировано, не дёргается layout
    return (
      <div className="overflow-hidden border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur h-7" />
    );
  }

  const items: Array<{ label: string; value: string; cls?: string }> = [];

  if (data.currencies.usdToKzt) {
    items.push({
      label: "USD",
      value: `${fmt(data.currencies.usdToKzt, 0)} ₸`,
      cls: "text-emerald-300",
    });
  }
  if (data.currencies.usdToRub) {
    items.push({
      label: "USD/RUB",
      value: `${fmt(data.currencies.usdToRub, 2)} ₽`,
    });
  }
  if (data.currencies.usdToEur) {
    items.push({
      label: "EUR/USD",
      value: `${fmt(1 / data.currencies.usdToEur, 2)}`,
    });
  }

  for (const s of data.skins.slice(0, 5)) {
    if (s.priceUsd) {
      items.push({
        label: s.shortName,
        value: `$${s.priceUsd.toFixed(2)}`,
        cls: "text-amber-200",
      });
    }
  }

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur">
      <div className="ticker-track flex gap-6 py-1.5 whitespace-nowrap text-[11px] font-mono">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-2 shrink-0">
            <span className="text-zinc-500 uppercase">{item.label}</span>
            <span className={item.cls ?? "text-zinc-200"}>{item.value}</span>
            <span className="text-zinc-700">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
