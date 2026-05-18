/**
 * Тонкая обёртка над console для hub-кода.
 *
 * Преимущества:
 *  - все логи с одинаковым префиксом [hub:<scope>]
 *  - в dev — выводятся; в production — можно перенаправить на error-reporter
 *  - один import везде, легко мокать в тестах
 */

type LogLevel = "info" | "warn" | "error";

function emit(level: LogLevel, scope: string, message: string, data?: unknown) {
  const prefix = `[hub:${scope}]`;
  if (data !== undefined) {
    console[level](prefix, message, data);
  } else {
    console[level](prefix, message);
  }
}

export const log = {
  info: (scope: string, message: string, data?: unknown) =>
    emit("info", scope, message, data),
  warn: (scope: string, message: string, data?: unknown) =>
    emit("warn", scope, message, data),
  error: (scope: string, message: string, data?: unknown) =>
    emit("error", scope, message, data),
};
