"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Player = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  steamId: string;
  elo: number;
  isCaptain: boolean;
  pickOrder: number | null;
};

type Snapshot = {
  id: string;
  state:
    | "CAPTAIN_SELECT"
    | "PICKING"
    | "VETO"
    | "SERVER_ALLOCATION"
    | "LIVE"
    | "CANCELLED"
    | "FINISHED";
  pickTurn: "A" | "B";
  matchId: string | null;
  captainA: Player;
  captainB: Player;
  teamA: Player[];
  teamB: Player[];
  available: Player[];
  nextPickOrder: number;
};

function PlayerCard({
  player,
  variant,
  pickOrder,
  onPick,
  pickable,
  busy,
}: {
  player: Player;
  variant: "teamA" | "teamB" | "available" | "captainA" | "captainB";
  pickOrder?: number;
  onPick?: () => void;
  pickable?: boolean;
  busy?: boolean;
}) {
  const isCaptainVariant = variant === "captainA" || variant === "captainB";
  const borderClass =
    variant === "captainA"
      ? "border-orange-500/60 bg-orange-500/10"
      : variant === "captainB"
      ? "border-rose-500/60 bg-rose-500/10"
      : variant === "teamA"
      ? "border-orange-500/30 bg-orange-500/5"
      : variant === "teamB"
      ? "border-rose-500/30 bg-rose-500/5"
      : "border-zinc-700 bg-zinc-900/60";

  const Wrapper: React.ElementType = pickable && !busy ? "button" : "div";
  const wrapperProps: React.HTMLAttributes<HTMLElement> & {
    type?: "button";
    disabled?: boolean;
  } =
    pickable && !busy
      ? { type: "button", onClick: onPick }
      : busy
      ? { type: "button", disabled: true }
      : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${borderClass} ${
        pickable && !busy
          ? "hover:bg-zinc-800/60 hover:scale-[1.01] cursor-pointer"
          : pickable && busy
          ? "opacity-50"
          : ""
      }`}
    >
      {player.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.avatarUrl}
          alt={player.username}
          className="w-11 h-11 rounded object-cover"
        />
      ) : (
        <div className="w-11 h-11 rounded bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500">
          {player.username[0]?.toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate text-sm flex items-center gap-2">
          {player.username}
          {isCaptainVariant && (
            <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-300">
              CAP
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono text-zinc-500 tabular-nums">
          {player.elo} ELO
        </div>
      </div>
      {pickOrder != null && (
        <div className="text-[10px] font-mono text-zinc-500">#{pickOrder}</div>
      )}
    </Wrapper>
  );
}

export function LobbyScreen({
  locale,
  lobbyId,
  meUserId,
}: {
  locale: string;
  lobbyId: string;
  meUserId: string;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/hub/lobby/${lobbyId}/stream`);
    es.addEventListener("update", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Snapshot;
        setSnap(data);

        // Завершение фазы пика → переход на следующую страницу.
        if (data.state === "VETO") {
          // Этап 4 ещё не реализован — пока возвращаем на дашборд с инфо.
          // На этапе 4 здесь будет router.push(`/${locale}/hub/lobby/${data.id}/veto`)
          setTimeout(() => router.push(`/${locale}/hub`), 2000);
          es.close();
          return;
        }
        if (data.state === "LIVE" && data.matchId) {
          router.push(`/${locale}/hub/match/${data.matchId}`);
          es.close();
          return;
        }
        if (data.state === "CANCELLED" || data.state === "FINISHED") {
          setTimeout(() => router.push(`/${locale}/hub`), 1500);
          es.close();
        }
      } catch {
        // ignore
      }
    });
    es.addEventListener("error", () => setError("Соединение потеряно"));
    return () => es.close();
  }, [router, locale, lobbyId]);

  const myTeam = useMemo<"A" | "B" | null>(() => {
    if (!snap) return null;
    if (snap.captainA.userId === meUserId) return "A";
    if (snap.captainB.userId === meUserId) return "B";
    if (snap.teamA.some((p) => p.userId === meUserId)) return "A";
    if (snap.teamB.some((p) => p.userId === meUserId)) return "B";
    return null;
  }, [snap, meUserId]);

  const iAmCaptain = useMemo(() => {
    if (!snap) return false;
    return (
      snap.captainA.userId === meUserId || snap.captainB.userId === meUserId
    );
  }, [snap, meUserId]);

  const myTurn = iAmCaptain && snap?.pickTurn === myTeam;

  const onPick = async (pickedUserId: string) => {
    if (!snap || picking) return;
    setPicking(pickedUserId);
    setError(null);
    try {
      const res = await fetch(`/api/hub/lobby/${lobbyId}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickedUserId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка пика");
      }
    } catch {
      setError("Сетевая ошибка");
    } finally {
      setPicking(null);
    }
  };

  if (!snap) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 text-center text-zinc-500 font-mono text-sm">
        Загрузка лобби...
      </div>
    );
  }

  const inPickingPhase =
    snap.state === "PICKING" || snap.state === "CAPTAIN_SELECT";
  const turnLabel = snap.pickTurn === "A" ? "Капитан A" : "Капитан B";
  const turnCaptainName =
    snap.pickTurn === "A" ? snap.captainA.username : snap.captainB.username;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Хедер фазы */}
      <div className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-zinc-900 to-zinc-950 p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
            Фаза лобби
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {snap.state === "PICKING" || snap.state === "CAPTAIN_SELECT"
              ? "PICK ИГРОКОВ"
              : snap.state === "VETO"
              ? "MAP VETO"
              : snap.state === "SERVER_ALLOCATION"
              ? "ВЫДЕЛЕНИЕ СЕРВЕРА"
              : snap.state === "LIVE"
              ? "МАТЧ ИДЁТ"
              : snap.state === "CANCELLED"
              ? "ОТМЕНЁНО"
              : "ЗАВЕРШЕНО"}
          </h1>
        </div>
        {inPickingPhase && (
          <div className="flex flex-col items-end">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Сейчас ходит
            </div>
            <div className="text-lg font-bold">
              <span
                className={
                  snap.pickTurn === "A" ? "text-orange-300" : "text-rose-300"
                }
              >
                {turnLabel}
              </span>{" "}
              <span className="text-zinc-400">— {turnCaptainName}</span>
            </div>
            {myTurn && (
              <div className="text-[10px] font-mono text-emerald-400 mt-1 animate-pulse">
                ВАШ ХОД — выберите игрока
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3 колонки: Team A | Available | Team B */}
      <div className="grid lg:grid-cols-[1fr_1.2fr_1fr] gap-4">
        {/* Team A */}
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-orange-300">
              Team A
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">
              {1 + snap.teamA.length} / 5
            </span>
          </div>
          <div className="space-y-2">
            <PlayerCard player={snap.captainA} variant="captainA" />
            {snap.teamA.map((p) => (
              <PlayerCard
                key={p.userId}
                player={p}
                variant="teamA"
                pickOrder={p.pickOrder ?? undefined}
              />
            ))}
            {Array.from({
              length: Math.max(0, 4 - snap.teamA.length),
            }).map((_, i) => (
              <div
                key={i}
                className="h-[64px] rounded-lg border border-dashed border-orange-500/20 bg-zinc-900/30"
              />
            ))}
          </div>
        </div>

        {/* Available */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-400">
              Доступные игроки
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">
              {snap.available.length} осталось
            </span>
          </div>
          <div className="space-y-2">
            {snap.available.length === 0 ? (
              <div className="text-center text-sm text-zinc-500 font-mono py-6">
                все игроки выбраны
              </div>
            ) : (
              snap.available.map((p) => (
                <PlayerCard
                  key={p.userId}
                  player={p}
                  variant="available"
                  pickable={myTurn}
                  busy={picking === p.userId}
                  onPick={() => onPick(p.userId)}
                />
              ))
            )}
          </div>
        </div>

        {/* Team B */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-mono uppercase tracking-widest text-rose-300">
              Team B
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">
              {1 + snap.teamB.length} / 5
            </span>
          </div>
          <div className="space-y-2">
            <PlayerCard player={snap.captainB} variant="captainB" />
            {snap.teamB.map((p) => (
              <PlayerCard
                key={p.userId}
                player={p}
                variant="teamB"
                pickOrder={p.pickOrder ?? undefined}
              />
            ))}
            {Array.from({
              length: Math.max(0, 4 - snap.teamB.length),
            }).map((_, i) => (
              <div
                key={i}
                className="h-[64px] rounded-lg border border-dashed border-rose-500/20 bg-zinc-900/30"
              />
            ))}
          </div>
        </div>
      </div>

      {snap.state === "VETO" && (
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-center">
          <div className="text-sm font-bold text-emerald-300">
            Пик завершён — переход к выбору карт
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-1">
            Map veto будет реализован на этапе 4. Возвращаем на дашборд...
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-rose-300 font-mono text-center">
          {error}
        </div>
      )}
    </div>
  );
}
