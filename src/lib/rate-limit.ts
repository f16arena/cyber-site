/**
 * Простой in-memory rate limiter с sliding window.
 * Подходит для одного serverless-инстанса; для распределённого
 * лимита (несколько Vercel regions) нужен Redis (Upstash).
 *
 * Хранит timestamps в Map. Periodic cleanup при каждом вызове
 * (удаляет ключи где >5 минут не было запросов).
 */

type Bucket = number[];

const buckets = new Map<string, Bucket>();
let lastCleanup = Date.now();

function cleanup() {
  if (Date.now() - lastCleanup < 60_000) return;
  lastCleanup = Date.now();
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, ts] of buckets.entries()) {
    const fresh = ts.filter((t) => t > cutoff);
    if (fresh.length === 0) buckets.delete(key);
    else buckets.set(key, fresh);
  }
}

/**
 * Проверяет лимит. Возвращает {allowed, remaining, resetMs}.
 * @param key уникальный идентификатор (userId или IP)
 * @param limit максимум запросов в окне
 * @param windowMs окно в миллисекундах
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetMs: number } {
  cleanup();

  const now = Date.now();
  const cutoff = now - windowMs;

  const ts = (buckets.get(key) || []).filter((t) => t > cutoff);

  if (ts.length >= limit) {
    const oldest = ts[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldest + windowMs - now,
    };
  }

  ts.push(now);
  buckets.set(key, ts);

  return {
    allowed: true,
    remaining: limit - ts.length,
    resetMs: 0,
  };
}

/** Получает IP клиента для rate limiting. */
export function getClientKey(request: Request, userId?: string): string {
  if (userId) return `u:${userId}`;
  // Vercel forwards real IP в этих хедерах
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}
