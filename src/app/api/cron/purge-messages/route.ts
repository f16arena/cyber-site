import { NextResponse } from "next/server";
import { purgeAllOldMessages } from "@/lib/conversations";

/**
 * Глобальная очистка чата — удаляет сообщения старше 24 часов.
 * Вызывается Vercel Cron раз в час (или вручную).
 *
 * Защита: требуем секрет в заголовке `Authorization: Bearer <CRON_SECRET>`
 * или query-параметр `?secret=...` для совместимости с Vercel Cron.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  if (cronSecret) {
    const authMatches = auth === `Bearer ${cronSecret}`;
    const queryMatches = querySecret === cronSecret;
    if (!authMatches && !queryMatches) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await purgeAllOldMessages();
  return NextResponse.json({ deleted: result.count });
}
