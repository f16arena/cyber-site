"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Авто-обновление страницы (router.refresh) каждые N секунд.
 * Используется на /matches/[id] когда status=LIVE — счёт и счётчики
 * подтянутся без перезагрузки.
 */
export function LiveAutoRefresh({
  intervalMs = 15_000,
  enabled = true,
}: {
  intervalMs?: number;
  enabled?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, enabled]);

  return null;
}
