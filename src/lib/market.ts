import { unstable_cache } from "next/cache";

/**
 * Получает курсы валют относительно USD.
 * API: open.er-api.com (бесплатный, без ключа).
 */
async function fetchCurrencyRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 }, // 1 час
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { rates?: Record<string, number> };
    return data.rates ?? {};
  } catch {
    return {};
  }
}

export type SkinPrice = {
  name: string;
  shortName: string;
  priceUsd: number | null;
  imageUrl?: string;
};

const POPULAR_SKINS = [
  { name: "AK-47 | Asiimov (Field-Tested)", shortName: "AK-47 Asiimov" },
  { name: "AWP | Dragon Lore (Field-Tested)", shortName: "AWP Dragon Lore" },
  { name: "M4A4 | Howl (Field-Tested)", shortName: "M4A4 Howl" },
  { name: "AWP | Asiimov (Field-Tested)", shortName: "AWP Asiimov" },
  { name: "Karambit | Doppler (Factory New)", shortName: "Karambit Doppler" },
  { name: "★ M9 Bayonet | Marble Fade (Factory New)", shortName: "M9 Marble Fade" },
];

async function fetchSkinPrice(marketHashName: string): Promise<number | null> {
  try {
    const url = `https://steamcommunity.com/market/priceoverview/?appid=730&currency=1&market_hash_name=${encodeURIComponent(marketHashName)}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      median_price?: string;
      lowest_price?: string;
    };
    if (!data.success) return null;
    const priceStr = data.median_price ?? data.lowest_price;
    if (!priceStr) return null;
    // Формат: "$45.30"
    const cleaned = priceStr.replace(/[^0-9.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

export type MarketTickerData = {
  currencies: {
    usdToKzt: number | null;
    usdToRub: number | null;
    usdToEur: number | null;
  };
  skins: SkinPrice[];
  updatedAt: string;
};

/**
 * Кешируется на 1 час. Подходит для прямого вызова в Server Component.
 */
export const getMarketTicker = unstable_cache(
  async (): Promise<MarketTickerData> => {
    const [rates, ...prices] = await Promise.all([
      fetchCurrencyRates(),
      ...POPULAR_SKINS.map((s) => fetchSkinPrice(s.name)),
    ]);

    return {
      currencies: {
        usdToKzt: rates.KZT ?? null,
        usdToRub: rates.RUB ?? null,
        usdToEur: rates.EUR ?? null,
      },
      skins: POPULAR_SKINS.map((s, i) => ({
        name: s.name,
        shortName: s.shortName,
        priceUsd: prices[i],
      })),
      updatedAt: new Date().toISOString(),
    };
  },
  ["market-ticker"],
  { revalidate: 3600 }
);
