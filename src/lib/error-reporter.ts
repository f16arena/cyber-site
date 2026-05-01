type ErrorContext = Record<string, unknown>;

/**
 * Лёгкий репортер ошибок. Сейчас логирует в console + опциональный webhook.
 * Когда понадобится Sentry — поставить @sentry/nextjs и заменить тело на Sentry.captureException.
 *
 * SENTRY_DSN — флаг включения отправки на webhook (формат произвольный, можно Slack/Discord).
 */
export function reportError(error: unknown, context?: ErrorContext) {
  const err = error instanceof Error ? error : new Error(String(error));
  const payload = {
    message: err.message,
    stack: err.stack,
    context: context ?? {},
    at: new Date().toISOString(),
  };

  console.error("[error-reporter]", payload);

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  fetch(dsn, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
