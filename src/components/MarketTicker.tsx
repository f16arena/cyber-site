import { getMarketTicker } from "@/lib/market";

function fmtMoney(n: number | null, decimals = 1): string {
  if (n === null || isNaN(n)) return "—";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtUsd(n: number | null): string {
  if (n === null || isNaN(n)) return "—";
  return `$${n.toFixed(2)}`;
}

export async function MarketTicker() {
  const data = await getMarketTicker();

  const items: Array<{ label: string; value: string; cls?: string }> = [];

  if (data.currencies.usdToKzt) {
    items.push({
      label: "USD",
      value: `${fmtMoney(data.currencies.usdToKzt, 0)} ₸`,
      cls: "text-emerald-300",
    });
  }
  if (data.currencies.usdToRub) {
    items.push({
      label: "USD/RUB",
      value: `${fmtMoney(data.currencies.usdToRub, 2)} ₽`,
    });
  }
  if (data.currencies.usdToEur) {
    items.push({
      label: "EUR/USD",
      value: `${fmtMoney(1 / data.currencies.usdToEur, 2)}`,
    });
  }

  for (const s of data.skins.slice(0, 5)) {
    if (s.priceUsd) {
      items.push({
        label: s.shortName,
        value: fmtUsd(s.priceUsd),
        cls: "text-amber-200",
      });
    }
  }

  if (items.length === 0) {
    return null;
  }

  // Дублируем для бесконечной прокрутки
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
