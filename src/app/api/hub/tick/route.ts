import { NextResponse } from "next/server";
import { runTick } from "@/lib/hub/tick";

/**
 * Сервисный эндпоинт — гонит maintenance-логику hub.
 * Используется:
 *  - SSE-стримы вызывают runTick() сами (не через этот endpoint), это лишь резерв
 *  - Cron (Vercel / внешний планировщик) может бить сюда раз в минуту
 *  - Локально можно тестировать руками
 *
 * Защита: токен в заголовке X-Hub-Tick-Secret (env HUB_TICK_SECRET).
 * Если секрет не задан — разрешаем (dev).
 */
export async function POST(req: Request) {
  const secret = process.env.HUB_TICK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-hub-tick-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  await runTick();
  return NextResponse.json({ ok: true });
}

export const GET = POST;
