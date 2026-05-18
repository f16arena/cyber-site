"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "SOLO" | "DUO" | "FIVE";
type Format = "BO1" | "BO3" | "BO5";
type Privacy = "OPEN" | "INVITE";

const MODES: { id: Mode; label: string; sub: string }[] = [
  { id: "SOLO", label: "1 vs 1", sub: "Дуэль" },
  { id: "DUO", label: "2 vs 2", sub: "Пара" },
  { id: "FIVE", label: "5 vs 5", sub: "Команда" },
];

const FORMATS: { id: Format; label: string; mapsNeeded: number; sub: string }[] = [
  { id: "BO1", label: "Best of 1", mapsNeeded: 1, sub: "1 карта" },
  { id: "BO3", label: "Best of 3", mapsNeeded: 3, sub: "до 3 карт" },
  { id: "BO5", label: "Best of 5", mapsNeeded: 5, sub: "до 5 карт" },
];

const PRIVACY: { id: Privacy; label: string; sub: string; icon: string }[] = [
  { id: "OPEN", label: "Открытый", sub: "Любой может присоединиться", icon: "🌐" },
  { id: "INVITE", label: "По приглашению", sub: "Только приглашённые", icon: "🔒" },
];

const MAPS = [
  { id: "mirage", label: "Mirage", accent: "#f59e0b" },
  { id: "inferno", label: "Inferno", accent: "#dc2626" },
  { id: "nuke", label: "Nuke", accent: "#0ea5e9" },
  { id: "ancient", label: "Ancient", accent: "#16a34a" },
  { id: "anubis", label: "Anubis", accent: "#ca8a04" },
  { id: "vertigo", label: "Vertigo", accent: "#64748b" },
  { id: "dust2", label: "Dust 2", accent: "#ea580c" },
];

const DEFAULT_POOL = MAPS.map((m) => m.id); // все 7 по умолчанию

export function CreateMatchForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("FIVE");
  const [format, setFormat] = useState<Format>("BO1");
  const [privacy, setPrivacy] = useState<Privacy>("OPEN");
  const [pool, setPool] = useState<string[]>(DEFAULT_POOL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapsNeeded = FORMATS.find((f) => f.id === format)!.mapsNeeded;
  const poolValid = pool.length >= Math.max(7, mapsNeeded + 6);
  // Для BO1 нужно минимум 7 карт (6 банов + 1 выбор)
  // Для BO3 нужно минимум 7 (2 ban + 3 pick + 2 ban + остаток) — упростим: всегда 7
  const poolTooSmall = pool.length < 7;

  const togglePool = (mapId: string) => {
    setPool((p) =>
      p.includes(mapId) ? p.filter((m) => m !== mapId) : [...p, mapId]
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (poolTooSmall) {
      setError(`Минимум 7 карт в pool (сейчас ${pool.length})`);
      return;
    }
    setSubmitting(true);

    // FRONTEND-ONLY mock: сохраняем настройки в URL и переходим в "арену".
    // Бекенд подключится позже на другом сервере — там и будет реальное создание.
    const mockId = `local-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    const params = new URLSearchParams({
      name: name.trim() || "Custom Match",
      mode,
      format,
      privacy,
      pool: pool.join(","),
      host: "me",
    });
    router.push(`/${locale}/hub/arena/${mockId}?${params.toString()}`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Название */}
      <section>
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400">
            Название матча
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friday scrim"
            maxLength={50}
            className="mt-2 w-full h-12 rounded-lg bg-zinc-900 border border-zinc-800 px-4 text-base focus:border-orange-500 focus:outline-none transition-colors"
          />
        </label>
      </section>

      {/* Режим */}
      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-2">
          Режим
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`flex flex-col items-center justify-center rounded-lg py-4 transition-all border-2 ${
                mode === m.id
                  ? "bg-gradient-to-br from-orange-500/30 to-rose-600/30 border-orange-400 text-orange-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <span className="text-xl font-black tracking-tight">{m.label}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-70 mt-0.5">
                {m.sub}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Формат */}
      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-2">
          Формат
        </div>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormat(f.id)}
              className={`flex flex-col items-center justify-center rounded-lg py-4 transition-all border-2 ${
                format === f.id
                  ? "bg-gradient-to-br from-violet-500/30 to-fuchsia-600/30 border-violet-400 text-violet-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <span className="text-xl font-black tracking-tight">{f.id}</span>
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-70 mt-0.5">
                {f.sub}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Map pool */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400">
            Карты в pool ({pool.length} / 7)
          </div>
          {pool.length < 7 && (
            <span className="text-[10px] font-mono text-rose-300">
              минимум 7
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {MAPS.map((m) => {
            const active = pool.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => togglePool(m.id)}
                className={`relative overflow-hidden rounded-lg h-20 transition-all border-2 ${
                  active
                    ? "scale-100 opacity-100"
                    : "scale-95 opacity-40 grayscale"
                }`}
                style={{
                  background: `linear-gradient(135deg, ${m.accent}55 0%, ${m.accent}aa 100%)`,
                  borderColor: active ? m.accent : "transparent",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-white drop-shadow">
                    {m.label}
                  </span>
                  {active && (
                    <span className="text-[9px] font-mono uppercase tracking-widest text-white/80 mt-0.5">
                      ✓ В POOL
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Приватность */}
      <section>
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-2">
          Приватность
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRIVACY.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPrivacy(p.id)}
              className={`flex items-center gap-3 rounded-lg p-4 transition-all border-2 text-left ${
                privacy === p.id
                  ? "bg-zinc-900 border-orange-400 text-zinc-100"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              <span className="text-2xl">{p.icon}</span>
              <div className="min-w-0">
                <div className="font-bold text-sm">{p.label}</div>
                <div className="text-[11px] font-mono text-zinc-500">
                  {p.sub}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || poolTooSmall}
          className="flex-1 h-14 rounded-lg font-black tracking-wide bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-400 hover:to-rose-500 disabled:opacity-50 transition-all"
        >
          {submitting ? "..." : "СОЗДАТЬ МАТЧ"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/hub`)}
          className="px-5 h-14 rounded-lg font-bold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
