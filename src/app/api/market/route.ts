import { NextResponse } from "next/server";
import { getMarketTicker } from "@/lib/market";

export const revalidate = 3600; // 1 час

export async function GET() {
  const data = await getMarketTicker();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
