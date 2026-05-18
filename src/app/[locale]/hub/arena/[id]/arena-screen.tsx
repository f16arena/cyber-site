"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapCard } from "@/components/hub/MapCard";
import { useToast } from "@/components/hub/Toast";

export type ArenaSettings = {
  id: string;
  name: string;
  mode: "SOLO" | "DUO" | "FIVE";
  format: "BO1" | "BO3" | "BO5";
  privacy: "OPEN" | "INVITE";
  pool: string[];
  serverType: "NORMAL" | "SKINS";
  host: string;
};

type Phase = "LOBBY" | "READY" | "VETO" | "LIVE" | "FINISHED";

const TEAM_SIZE: Record<ArenaSettings["mode"], number> = {
  SOLO: 1,
  DUO: 2,
  FIVE: 5,
};

const MODE_LABEL: Record<ArenaSettings["mode"], string> = {
  SOLO: "1 vs 1",
  DUO: "2 vs 2",
  FIVE: "5 vs 5",
};

type PlayerSlot = {
  name: string;
  avatarUrl: string | null;
  ready: boolean;
  isHost: boolean;
  team: "A" | "B";
};

type BanRecord = {
  map: string;
  team: "A" | "B";
  order: number;
};

const MOCK_INVITE_SUGGESTIONS = [
  { username: "BOT_alpha", avatar: null },
  { username: "BOT_bravo", avatar: null },
  { username: "BOT_charlie", avatar: null },
];

export function ArenaScreen({
  locale,
  settings,
  meName,
}: {
  locale: string;
  settings: ArenaSettings;
  meName: string;
}) {
  const router = useRouter();
  const { toast, ToastContainer } = useToast();
  const teamSize = TEAM_SIZE[settings.mode];
  const totalSlots = teamSize * 2;

  // Стартовое состояние: только хост в команде A
  const [slots, setSlots] = useState<PlayerSlot[]>(() => {
    const base: PlayerSlot[] = [];
    base.push({ name: meName, avatarUrl: null, ready: false, isHost: true, team: "A" });
    return base;
  });
  const [phase, setPhase] = useState<Phase>("LOBBY");
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [selectedMap, setSelectedMap] = useState<string | null>(null);
  const [vetoTurn, setVetoTurn] = useState<"A" | "B">("A");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  // Host actions (на frontend-mock пользователь всегда хост)
  const resetPhase = () => {
    setBans([]);
    setSelectedMap(null);
    setVetoTurn("A");
    setScoreA(0);
    setScoreB(0);
    setSlots((curr) => curr.map((s) => ({ ...s, ready: false })));
  };
  const restartMatch = () => {
    if (!confirm("Начать матч заново? Прогресс сбросится.")) return;
    resetPhase();
    setPhase("LOBBY");
  };
  const closeArena = () => {
    if (!confirm("Закрыть лобби? Все игроки будут выгнаны.")) return;
    router.push(`/${locale}/hub`);
  };
  const finishWithCustomScore = () => {
    const aRaw = prompt("Счёт Team A:", String(scoreA));
    if (aRaw === null) return;
    const bRaw = prompt("Счёт Team B:", String(scoreB));
    if (bRaw === null) return;
    const a = Number(aRaw);
    const b = Number(bRaw);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return;
    setScoreA(a);
    setScoreB(b);
    setPhase("FINISHED");
  };

  // Сколько банов нужно: для BO1 — все кроме 1. Для BO3 — все кроме 3 (но пара pick). Упростим.
  const targetPicks =
    settings.format === "BO1" ? 1 : settings.format === "BO3" ? 3 : 5;
  const targetBans = settings.pool.length - targetPicks;

  const teamA = slots.filter((s) => s.team === "A");
  const teamB = slots.filter((s) => s.team === "B");
  const allReady =
    slots.length === totalSlots && slots.every((s) => s.ready);

  const remainingMaps = settings.pool.filter(
    (m) => !bans.some((b) => b.map === m) && m !== selectedMap
  );

  // ─── Mock-actions для демонстрации flow ─────────────────────────
  const addBot = (team: "A" | "B") => {
    const teamCount = slots.filter((s) => s.team === team).length;
    if (teamCount >= teamSize) return;
    const idx = slots.length + 1;
    setSlots([
      ...slots,
      {
        name: `BOT_${idx.toString().padStart(2, "0")}`,
        avatarUrl: null,
        ready: false,
        isHost: false,
        team,
      },
    ]);
  };

  const kickSlot = (idx: number) => {
    setSlots(slots.filter((_, i) => i !== idx));
  };

  const toggleReady = (idx: number) => {
    setSlots(
      slots.map((s, i) => (i === idx ? { ...s, ready: !s.ready } : s))
    );
  };

  const startReady = () => {
    if (slots.length !== totalSlots) return;
    setPhase("READY");
    // Mock: за пол-секунды все ready
    setTimeout(() => {
      setSlots((curr) => curr.map((s) => ({ ...s, ready: true })));
      setTimeout(() => setPhase("VETO"), 800);
    }, 600);
  };

  const banMap = (mapId: string) => {
    if (phase !== "VETO") return;
    if (bans.length >= targetBans) return;
    setBans([
      ...bans,
      { map: mapId, team: vetoTurn, order: bans.length + 1 },
    ]);
    setVetoTurn(vetoTurn === "A" ? "B" : "A");

    if (bans.length + 1 === targetBans) {
      // Оставшаяся карта = выбранная (для BO1)
      const remaining = settings.pool.filter(
        (m) => ![...bans.map((b) => b.map), mapId].includes(m)
      );
      if (remaining.length > 0) {
        setSelectedMap(remaining[0]);
        setTimeout(() => setPhase("LIVE"), 1200);
      }
    }
  };

  const finishMatch = (winner: "A" | "B") => {
    if (winner === "A") setScoreA(16);
    else setScoreB(16);
    setPhase("FINISHED");
  };

  const phaseTitle = useMemo(() => {
    switch (phase) {
      case "LOBBY":
        return "Лобби — собираем игроков";
      case "READY":
        return "Ready-check";
      case "VETO":
        return "Map Veto";
      case "LIVE":
        return "Матч идёт";
      case "FINISHED":
        return "Завершён";
    }
  }, [phase]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
              {settings.privacy === "OPEN" ? "🌐 Открытый матч" : "🔒 По приглашению"} ·{" "}
              {phaseTitle}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
              {settings.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/40">
                {MODE_LABEL[settings.mode]}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/40">
                {settings.format}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-zinc-700/40 text-zinc-300 border border-zinc-700">
                {settings.pool.length} карт в pool
              </span>
              {settings.serverType === "SKINS" ? (
                <span
                  className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40"
                  title="WeaponPaints — игроки видят свои скины"
                >
                  ✦ СО СКИНАМИ
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded border bg-zinc-700/40 text-zinc-300 border-zinc-700">
                  🎮 Обычный сервер
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Заполнено
              </div>
              <div className="text-2xl font-black tabular-nums">
                {slots.length} / {totalSlots}
              </div>
            </div>
            {(phase === "LIVE" || phase === "FINISHED") && (
              <div className="text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  Счёт
                </div>
                <div className="text-2xl font-black tabular-nums">
                  <span className="text-orange-300">{scoreA}</span>
                  <span className="text-zinc-600 mx-1">:</span>
                  <span className="text-rose-300">{scoreB}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Host toolbar — управление матчем */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
          ⚙ Управление (хост)
        </div>
        <div className="flex flex-wrap gap-2">
          {phase !== "LOBBY" && (
            <button
              type="button"
              onClick={restartMatch}
              className="text-xs font-mono font-bold px-3 h-9 rounded border border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"
            >
              ↻ Начать заново
            </button>
          )}
          {phase === "VETO" && (
            <button
              type="button"
              onClick={() => {
                if (!confirm("Сбросить veto?")) return;
                setBans([]);
                setSelectedMap(null);
                setVetoTurn("A");
              }}
              className="text-xs font-mono font-bold px-3 h-9 rounded border border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
            >
              ↺ Сбросить veto
            </button>
          )}
          {(phase === "LIVE" || phase === "VETO") && (
            <button
              type="button"
              onClick={finishWithCustomScore}
              className="text-xs font-mono font-bold px-3 h-9 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            >
              ✓ Завершить со счётом
            </button>
          )}
          <button
            type="button"
            onClick={closeArena}
            className="text-xs font-mono font-bold px-3 h-9 rounded border border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
          >
            × Закрыть лобби
          </button>
        </div>
      </section>

      {/* Команды */}
      <div className="grid sm:grid-cols-2 gap-4">
        <TeamColumn
          team="A"
          slots={teamA}
          targetSize={teamSize}
          phase={phase}
          onAddBot={() => addBot("A")}
          onKick={(localIdx) => {
            const slotIdx = slots.findIndex((s) => s === teamA[localIdx]);
            if (slotIdx !== -1) kickSlot(slotIdx);
          }}
          onToggleReady={(localIdx) => {
            const slotIdx = slots.findIndex((s) => s === teamA[localIdx]);
            if (slotIdx !== -1) toggleReady(slotIdx);
          }}
        />
        <TeamColumn
          team="B"
          slots={teamB}
          targetSize={teamSize}
          phase={phase}
          onAddBot={() => addBot("B")}
          onKick={(localIdx) => {
            const slotIdx = slots.findIndex((s) => s === teamB[localIdx]);
            if (slotIdx !== -1) kickSlot(slotIdx);
          }}
          onToggleReady={(localIdx) => {
            const slotIdx = slots.findIndex((s) => s === teamB[localIdx]);
            if (slotIdx !== -1) toggleReady(slotIdx);
          }}
        />
      </div>

      {/* Lobby actions */}
      {phase === "LOBBY" && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-400 mb-2">
              Пригласить
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  toast("Список друзей — подключим, когда переедем на сервер", "info")
                }
                className="text-sm font-bold px-4 h-10 rounded border border-orange-500/40 bg-orange-500/10 text-orange-200 hover:bg-orange-500/20"
              >
                + Из друзей
              </button>
              <button
                type="button"
                onClick={() =>
                  toast("Свои команды — подключим, когда переедем на сервер", "info")
                }
                className="text-sm font-bold px-4 h-10 rounded border border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
              >
                + Свою команду
              </button>
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/${locale}/hub/arena/${settings.id}`;
                  navigator.clipboard
                    .writeText(link)
                    .then(() => toast("Ссылка скопирована", "success"))
                    .catch(() =>
                      toast("Не удалось скопировать", "error")
                    );
                }}
                className="text-sm font-mono px-4 h-10 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              >
                Скопировать ссылку
              </button>
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                Предложения
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MOCK_INVITE_SUGGESTIONS.map((s) => (
                  <button
                    key={s.username}
                    type="button"
                    onClick={() =>
                      toast(`Приглашение для ${s.username} — заглушка`, "info")
                    }
                    className="text-[11px] font-mono px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700 text-zinc-400"
                  >
                    + {s.username}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs font-mono text-zinc-500">
              Когда команды соберутся ({totalSlots} игроков) — запустите ready
            </div>
            <button
              type="button"
              onClick={startReady}
              disabled={slots.length !== totalSlots}
              className="px-6 h-11 rounded font-bold bg-gradient-to-r from-orange-500 to-rose-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Запустить ready-check →
            </button>
          </div>
        </section>
      )}

      {/* Ready-check phase */}
      {phase === "READY" && (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-2">
            READY CHECK
          </div>
          <div className="text-2xl font-black mb-1">
            Все подтверждают участие…
          </div>
          <div className="text-sm text-zinc-400">
            {slots.filter((s) => s.ready).length} / {totalSlots} готовы
          </div>
        </section>
      )}

      {/* Veto phase */}
      {phase === "VETO" && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
                Map Veto · {settings.format}
              </div>
              <h2 className="text-lg font-black tracking-tight">
                {bans.length < targetBans ? (
                  <>
                    Ход:{" "}
                    <span
                      className={
                        vetoTurn === "A" ? "text-orange-300" : "text-rose-300"
                      }
                    >
                      Team {vetoTurn}
                    </span>{" "}
                    · банит карту
                  </>
                ) : (
                  <span className="text-emerald-300">
                    Карта выбрана — запускаем матч…
                  </span>
                )}
              </h2>
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              {bans.length} / {targetBans} банов
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {settings.pool.map((mapId) => {
              const ban = bans.find((b) => b.map === mapId);
              const isSelected = selectedMap === mapId;
              const isBanned = !!ban;
              return (
                <MapCard
                  key={mapId}
                  mapId={mapId}
                  state={
                    isSelected
                      ? "selected"
                      : isBanned
                      ? "banned"
                      : "available"
                  }
                  team={ban?.team}
                  order={ban?.order}
                  onClick={() => banMap(mapId)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Live phase */}
      {phase === "LIVE" && selectedMap && (
        <section className="grid lg:grid-cols-[280px_1fr] gap-4">
          <MapCard mapId={selectedMap} state="selected" size="lg" />
          <div className="rounded-xl border border-orange-500/30 bg-zinc-900/50 p-5 space-y-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-1">
                ✓ Сервер выделен (mock)
              </div>
              <div className="text-xl font-mono">connect 127.0.0.1:27015</div>
              <div className="text-xs text-zinc-500 mt-1">
                В боевой версии адрес придёт от dedicated CS2 сервера через
                RCON. Сейчас — заглушка для UI-теста.
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-800 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => finishMatch("A")}
                className="text-xs font-bold px-3 h-9 rounded border border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
              >
                Mock: победила A
              </button>
              <button
                type="button"
                onClick={() => finishMatch("B")}
                className="text-xs font-bold px-3 h-9 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
              >
                Mock: победила B
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Finished */}
      {phase === "FINISHED" && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 mb-2">
            Матч завершён
          </div>
          <div className="text-3xl font-black tracking-tight mb-2">
            Победила Team {scoreA > scoreB ? "A" : "B"}
          </div>
          <div className="text-2xl font-mono tabular-nums">
            <span className="text-orange-300">{scoreA}</span>
            <span className="text-zinc-600 mx-2">:</span>
            <span className="text-rose-300">{scoreB}</span>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/hub`)}
            className="mt-5 h-10 px-5 rounded font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 text-sm"
          >
            На дашборд
          </button>
        </section>
      )}

      {/* Hint */}
      {(phase === "LOBBY" || phase === "VETO") && (
        <div className="text-[11px] font-mono text-zinc-600 text-center">
          frontend-only превью · бекенд подключим когда переедете на сервер
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

function TeamColumn({
  team,
  slots,
  targetSize,
  phase,
  onAddBot,
  onKick,
  onToggleReady,
}: {
  team: "A" | "B";
  slots: PlayerSlot[];
  targetSize: number;
  phase: Phase;
  onAddBot: () => void;
  onKick: (idx: number) => void;
  onToggleReady: (idx: number) => void;
}) {
  const accent =
    team === "A"
      ? {
          border: "border-orange-500/40",
          bg: "bg-orange-500/5",
          text: "text-orange-300",
        }
      : {
          border: "border-rose-500/40",
          bg: "bg-rose-500/5",
          text: "text-rose-300",
        };

  return (
    <section
      className={`rounded-xl border ${accent.border} ${accent.bg} p-4`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-sm font-mono uppercase tracking-widest ${accent.text}`}>
          Team {team}
        </h2>
        <span className="text-[11px] font-mono text-zinc-500">
          {slots.length} / {targetSize}
        </span>
      </div>
      <div className="space-y-2">
        {slots.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-lg border p-3 ${
              s.ready
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-zinc-800 bg-zinc-900/60"
            }`}
          >
            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
              {s.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate flex items-center gap-2">
                {s.name}
                {s.isHost && (
                  <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    HOST
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-zinc-500">
                {s.ready ? "✓ готов" : phase === "LOBBY" ? "ожидает" : "ещё нет"}
              </div>
            </div>
            {phase === "LOBBY" && !s.isHost && (
              <button
                type="button"
                onClick={() => onKick(i)}
                className="text-[10px] font-mono text-rose-300 hover:text-rose-200"
              >
                kick
              </button>
            )}
            {phase === "LOBBY" && (
              <button
                type="button"
                onClick={() => onToggleReady(i)}
                className={`text-[10px] font-mono px-2 py-1 rounded border ${
                  s.ready
                    ? "border-emerald-500/40 text-emerald-300"
                    : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s.ready ? "ready" : "set ready"}
              </button>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, targetSize - slots.length) }).map(
          (_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              disabled={phase !== "LOBBY"}
              onClick={onAddBot}
              className={`w-full h-[60px] rounded-lg border border-dashed transition-colors ${
                phase === "LOBBY"
                  ? "border-zinc-700 hover:border-orange-500/40 hover:bg-orange-500/5 cursor-pointer text-xs font-mono text-zinc-500 hover:text-orange-300"
                  : "border-zinc-800 bg-zinc-900/30 text-zinc-700 text-xs font-mono"
              }`}
            >
              {phase === "LOBBY" ? "+ добавить бота / слот" : "пусто"}
            </button>
          )
        )}
      </div>
    </section>
  );
}
