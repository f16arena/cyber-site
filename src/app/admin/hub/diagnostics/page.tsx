export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Check = {
  label: string;
  ok: boolean;
  value?: string;
  hint?: string;
};

async function checkSteamApiKey(): Promise<Check> {
  const key = process.env.STEAM_API_KEY?.trim();
  if (!key) {
    return {
      label: "STEAM_API_KEY",
      ok: false,
      hint: "Не задан. Получите ключ: https://steamcommunity.com/dev/apikey и пропишите в env.",
    };
  }
  // Пробуем дернуть Steam Web API с заведомо валидным SteamID (Gabe Newell).
  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(
    key
  )}&steamids=76561197960287930`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 200);
      return {
        label: "STEAM_API_KEY",
        ok: false,
        value: `длина ${key.length}, http ${res.status}`,
        hint: `Steam API вернул ${res.status}. Часто значит — невалидный ключ. Ответ: ${text}`,
      };
    }
    const data = (await res.json()) as {
      response?: { players?: unknown[] };
    };
    const players = data.response?.players ?? [];
    if (players.length === 0) {
      return {
        label: "STEAM_API_KEY",
        ok: false,
        value: `длина ${key.length}`,
        hint: "Ключ принят Steam, но ответ пустой — необычно. Проверьте ключ.",
      };
    }
    return {
      label: "STEAM_API_KEY",
      ok: true,
      value: `длина ${key.length}, тест-запрос OK`,
    };
  } catch (e) {
    return {
      label: "STEAM_API_KEY",
      ok: false,
      value: `длина ${key.length}`,
      hint: `Не удалось подключиться к Steam API: ${(e as Error).message}`,
    };
  }
}

function checkSiteUrl(): Check {
  const v = process.env.SITE_URL;
  if (!v) {
    return {
      label: "SITE_URL",
      ok: false,
      hint: "Не задан. Steam OpenID использует header host как fallback, но лучше задать явно (например https://cyber-site-five.vercel.app).",
    };
  }
  const valid = /^https?:\/\/[^/]+$/.test(v.trim());
  return {
    label: "SITE_URL",
    ok: valid,
    value: v,
    hint: valid
      ? undefined
      : "Должно быть полный URL без trailing slash, например https://example.com",
  };
}

function checkSessionSecret(): Check {
  const v = process.env.SESSION_SECRET;
  if (!v) {
    return {
      label: "SESSION_SECRET",
      ok: false,
      hint: "Не задан. iron-session не сможет писать cookie — сессия не сохранится.",
    };
  }
  const len = v.length;
  if (len < 32) {
    return {
      label: "SESSION_SECRET",
      ok: false,
      value: `длина ${len}`,
      hint: "iron-session требует минимум 32 символа. Сейчас короче — cookie не пишется.",
    };
  }
  return { label: "SESSION_SECRET", ok: true, value: `длина ${len}` };
}

async function checkDatabase(): Promise<Check> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { label: "DATABASE", ok: true, value: "соединение OK" };
  } catch (e) {
    return {
      label: "DATABASE",
      ok: false,
      hint: `Соединение не установилось: ${(e as Error).message}`,
    };
  }
}

function checkEncryptionKey(): Check {
  const v = process.env.HUB_ENCRYPTION_KEY;
  if (!v) {
    return {
      label: "HUB_ENCRYPTION_KEY",
      ok: process.env.NODE_ENV !== "production",
      value: "не задан",
      hint:
        process.env.NODE_ENV === "production"
          ? "В production обязателен (32 байта hex). RCON-пароли не шифруются."
          : "В dev допустимо — пароли хранятся с префиксом plain: (только локально).",
    };
  }
  if (!/^[0-9a-fA-F]{64}$/.test(v)) {
    return {
      label: "HUB_ENCRYPTION_KEY",
      ok: false,
      hint: "Должен быть 64 hex символа (32 байта). Сейчас неверный формат.",
    };
  }
  return { label: "HUB_ENCRYPTION_KEY", ok: true, value: "32 bytes hex" };
}

function envFlag(label: string, name: string, expectedHint: string): Check {
  const v = process.env[name];
  return {
    label: name,
    ok: !!v,
    value: v ? "задан" : "не задан",
    hint: expectedHint,
  };
}

export default async function DiagnosticsPage() {
  await requireAdmin();

  const [steam, db] = await Promise.all([checkSteamApiKey(), checkDatabase()]);
  const checks: Check[] = [
    steam,
    checkSiteUrl(),
    checkSessionSecret(),
    db,
    checkEncryptionKey(),
    envFlag(
      "DEV_LOGIN_TOKEN",
      "DEV_LOGIN_TOKEN",
      "Опционально. В production обязателен, если включен ALLOW_DEV_LOGIN."
    ),
    envFlag(
      "ALLOW_DEV_LOGIN",
      "ALLOW_DEV_LOGIN",
      "Если 'true' — /api/auth/_dev/login работает в production. Использовать только временно."
    ),
    envFlag(
      "HUB_MATCHZY_SECRET",
      "HUB_MATCHZY_SECRET",
      "Для проверки подписи MatchZy webhook. В production обязателен."
    ),
    envFlag(
      "HUB_RCON_LIVE",
      "HUB_RCON_LIVE",
      "Если 'true' — реальный RCON. На MVP оставьте unset (стаб)."
    ),
  ];

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400">
          F16 Hub
        </div>
        <h1 className="text-2xl font-black tracking-tight">Диагностика окружения</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Быстрая проверка env, БД и Steam Web API. Помогает понять, почему
          ломается Steam-вход или ELO.
        </p>
      </header>

      <div className="space-y-2">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border p-4 ${
              c.ok
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-rose-500/40 bg-rose-500/10"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    c.ok
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                  }`}
                >
                  {c.ok ? "OK" : "FAIL"}
                </span>
                <span className="font-bold font-mono text-sm">{c.label}</span>
                {c.value && (
                  <span className="text-xs font-mono text-zinc-400">
                    {c.value}
                  </span>
                )}
              </div>
            </div>
            {c.hint && (
              <div className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {c.hint}
              </div>
            )}
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-300 mb-2">
          Стандартные env для прода
        </h2>
        <pre className="text-[11px] font-mono whitespace-pre-wrap bg-zinc-950 border border-zinc-800 rounded p-3 mt-2 leading-relaxed text-zinc-300">
{`STEAM_API_KEY=<с https://steamcommunity.com/dev/apikey>
SITE_URL=https://your-domain.com
SESSION_SECRET=<минимум 32 символа>
DATABASE_URL=postgres://...
DIRECT_URL=postgres://...
HUB_ENCRYPTION_KEY=<64 hex символа, для шифрования RCON>
HUB_MATCHZY_SECRET=<random для webhook>
# временно для входа без Steam:
# ALLOW_DEV_LOGIN=true
# DEV_LOGIN_TOKEN=<random>`}
        </pre>
      </section>
    </div>
  );
}
