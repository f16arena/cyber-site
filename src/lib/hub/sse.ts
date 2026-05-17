/**
 * Server-Sent Events helper.
 *
 * snapshotFn вызывается раз в `intervalMs` и шлёт JSON клиенту как `event: update`.
 * Для отмены потока (пользователь закрыл вкладку) слушаем request.signal.
 *
 * Стратегия "пинговать БД раз в секунду" выбрана сознательно для MVP:
 * — не нужно поднимать pg LISTEN/NOTIFY и отдельное соединение
 * — переживает HMR в dev-режиме
 * — на серверлесс/Edge ограничения по long-running проще обходятся
 *
 * Когда станет узким местом — поменяем на Postgres NOTIFY без изменения API.
 */

const encoder = new TextEncoder();

function formatEvent(event: string, data: unknown): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return encoder.encode(`event: ${event}\ndata: ${payload}\n\n`);
}

function formatComment(text: string): Uint8Array {
  return encoder.encode(`: ${text}\n\n`);
}

export type SseStreamOptions<T> = {
  /** Снапшот, отправляется первым сообщением и затем каждый tick. */
  snapshot: (signal: AbortSignal) => Promise<T>;
  /** Между тиками. По умолчанию 1000 мс. */
  intervalMs?: number;
  /** Сигнал отмены от Request (request.signal). */
  signal: AbortSignal;
  /**
   * Если вернёт true — стрим закрывается после отправки этого снапшота.
   * Полезно для terminal-состояний (READY_CHECK найден, лобби готово и т.п.).
   */
  isTerminal?: (snapshot: T) => boolean;
};

export function createSseStream<T>(options: SseStreamOptions<T>): Response {
  const interval = options.intervalMs ?? 1000;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      options.signal.addEventListener("abort", close);

      // Первый снапшот сразу
      try {
        const first = await options.snapshot(options.signal);
        if (!closed) controller.enqueue(formatEvent("update", first));
        if (options.isTerminal?.(first)) {
          close();
          return;
        }
      } catch (e) {
        controller.enqueue(
          formatEvent("error", { message: (e as Error).message })
        );
        close();
        return;
      }

      const tick = async () => {
        if (closed) return;
        try {
          const snap = await options.snapshot(options.signal);
          if (closed) return;
          controller.enqueue(formatEvent("update", snap));
          if (options.isTerminal?.(snap)) {
            close();
            return;
          }
        } catch (e) {
          if (closed) return;
          controller.enqueue(
            formatEvent("error", { message: (e as Error).message })
          );
          close();
          return;
        }
        if (!closed) {
          timeoutId = setTimeout(tick, interval);
        }
      };

      // Heartbeat-комментарий каждые 25с — чтобы прокси не закрывал idle-соединение
      const pingId = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(formatComment("ping"));
        } catch {
          // controller closed
        }
      }, 25_000);

      let timeoutId: ReturnType<typeof setTimeout> = setTimeout(tick, interval);

      options.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId);
        clearInterval(pingId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
