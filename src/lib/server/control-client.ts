/**
 * HTTPS-клиент к домашнему srv-control (через Cloudflare Tunnel).
 *
 * Все запросы подписываются HMAC-SHA256. Заголовок X-F16-Signature
 * совпадает с тем что ожидает /server/:id/rcon в srv-control.
 */

import { hmacSign } from "./crypto";
import crypto from "node:crypto";

export type RconResult =
  | { ok: true; response: string }
  | { ok: false; error: string; status?: number };

function bodyHash(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function getControlConfig(): { url: string; secret: string } | null {
  const url = process.env.SRV_CONTROL_URL;
  const secret = process.env.SRV_CONTROL_SECRET;
  if (!url || !secret) return null;
  return { url: url.replace(/\/$/, ""), secret };
}

/**
 * Выполнить RCON-команду на удалённом сервере через srv-control.
 * Если SRV_CONTROL_URL не сконфигурирован — возвращает ошибку.
 */
export async function execRconRemote(
  serverId: string,
  command: string
): Promise<RconResult> {
  const cfg = getControlConfig();
  if (!cfg) {
    return {
      ok: false,
      error:
        "SRV_CONTROL_URL/SRV_CONTROL_SECRET не заданы. Поднимите домашний srv-control (см. HOME_SERVER_SETUP.md).",
    };
  }

  const path = `/server/${serverId}/rcon`;
  const body = JSON.stringify({ command });
  const signature = hmacSign(
    `POST\n${path}\n${bodyHash(body)}`,
    cfg.secret
  );

  try {
    const resp = await fetch(`${cfg.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-F16-Signature": signature,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const data = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      response?: string;
      error?: string;
    };

    if (!resp.ok) {
      return {
        ok: false,
        error: data.error ?? `HTTP ${resp.status}`,
        status: resp.status,
      };
    }
    return { ok: true, response: data.response ?? "" };
  } catch (e) {
    return {
      ok: false,
      error: `Не удалось связаться с srv-control: ${(e as Error).message}`,
    };
  }
}

/** Health-check срв-control'а — для admin UI. */
export async function pingControl(): Promise<
  { ok: true; servers: number } | { ok: false; error: string }
> {
  const cfg = getControlConfig();
  if (!cfg) return { ok: false, error: "SRV_CONTROL_URL не задан" };

  try {
    const resp = await fetch(`${cfg.url}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    const data = (await resp.json()) as { ok?: boolean; servers?: number };
    return { ok: true, servers: data.servers ?? 0 };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
