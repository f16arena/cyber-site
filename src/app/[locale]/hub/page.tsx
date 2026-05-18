export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { prisma } from "@/lib/prisma";
import { displayNameFor } from "@/lib/hub/maps";
import { getQueueSnapshot } from "@/lib/hub/queue";
import { FindMatchButton } from "./find-match-button";
import { LevelBadge } from "@/components/hub/LevelBadge";
import { levelProgress, levelFor } from "@/lib/hub/level";
import { getPartyForUser, getIncomingInvites } from "@/lib/hub/party";
import { PartyBlock } from "./party-block";

function formatRelative(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`;
  return date.toLocaleDateString("ru-RU");
}

function winrate(wins: number, losses: number): number | null {
  const total = wins + losses;
  if (total === 0) return null;
  return Math.round((wins / total) * 100);
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">
        {label}
      </div>
      <div className={`text-2xl font-black tabular-nums ${accent ?? "text-zinc-100"}`}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px] font-mono text-zinc-500 mt-1">{hint}</div>
      )}
    </div>
  );
}

export default async function HubDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getOptionalHubUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-xl border border-orange-500/30 bg-zinc-900/60 p-10 text-center">
          <h1 className="text-3xl font-black tracking-tight mb-3">
            <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
              F16 HUB
            </span>
          </h1>
          <p className="text-zinc-400 max-w-md mx-auto mb-6">
            CS2-матчмейкинг по системе FACEIT: очередь 5v5, ready-check, капитаны,
            ban/pick карт, выделенный сервер.
          </p>
          <Link
            href="/api/auth/steam"
            className="inline-flex items-center h-11 px-6 rounded font-bold bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-400 hover:to-rose-500 transition-all"
          >
            Войти через Steam
          </Link>
        </div>
      </div>
    );
  }

  // Если пользователь уже в очереди / ready-check / лобби — отправляем на соответствующую страницу
  const queueSnap = await getQueueSnapshot(user.id);
  if (queueSnap.ticket?.status === "SEARCHING") {
    redirect(`/${locale}/hub/queue`);
  }
  if (
    queueSnap.ticket?.status === "READY_CHECK" &&
    queueSnap.ticket.readyCheckId
  ) {
    redirect(`/${locale}/hub/ready-check/${queueSnap.ticket.readyCheckId}`);
  }
  if (queueSnap.lobbyId) {
    redirect(`/${locale}/hub/lobby/${queueSnap.lobbyId}`);
  }

  // Party (если есть) и входящие инвайты
  const [party, incomingInvitesRaw] = await Promise.all([
    getPartyForUser(user.id),
    getIncomingInvites(user.id),
  ]);
  const incomingInvites = incomingInvitesRaw.map((inv) => ({
    id: inv.id,
    partyId: inv.party.id,
    leaderUsername: inv.party.leader.username,
    leaderAvatar: inv.party.leader.avatarUrl,
    leaderElo: inv.party.leader.hubElo,
    memberCount: inv.party._count.members,
  }));

  // Последние матчи hub
  const recentMatches = await prisma.hubMatch.findMany({
    where: {
      OR: [
        { teamAPlayerIds: { has: user.steamId } },
        { teamBPlayerIds: { has: user.steamId } },
      ],
      state: "FINISHED",
    },
    orderBy: { finishedAt: "desc" },
    take: 5,
    select: {
      id: true,
      map: true,
      scoreA: true,
      scoreB: true,
      winner: true,
      teamAPlayerIds: true,
      finishedAt: true,
    },
  });

  const wr = winrate(user.hubWins, user.hubLosses);
  const now = new Date();
  const bannedActive =
    user.hubBannedUntil && user.hubBannedUntil > now ? user.hubBannedUntil : null;
  const cooldownActive =
    user.hubCooldownUntil && user.hubCooldownUntil > now
      ? user.hubCooldownUntil
      : null;
  const canPlay = !bannedActive && !cooldownActive;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Профиль + Find Match */}
      <section className="grid lg:grid-cols-[1fr_auto] gap-6 items-stretch">
        <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 flex items-center gap-5">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-20 h-20 rounded-lg border-2 border-orange-500/40 object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-zinc-800 border-2 border-orange-500/40 flex items-center justify-center font-black text-2xl text-zinc-500">
              {user.username[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-1">
              CS2 Игрок
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate flex items-center gap-3">
              <span className="truncate">{user.username}</span>
              <LevelBadge elo={user.hubElo} size="md" />
            </h1>
            <div className="text-xs font-mono text-zinc-500 mt-1">
              SteamID64: {user.steamId}
            </div>
            {(() => {
              const lvl = levelFor(user.hubElo);
              const { progress, toNext } = levelProgress(user.hubElo);
              if (toNext === null) {
                return (
                  <div className="text-[11px] font-mono text-amber-300 mt-1.5">
                    Максимальный уровень
                  </div>
                );
              }
              return (
                <div className="mt-2">
                  <div className="h-1 w-full max-w-xs rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full ${lvl.bgClass} ${lvl.borderClass.replace("border-", "bg-")}`}
                      style={{
                        width: `${Math.round(progress * 100)}%`,
                        background:
                          "linear-gradient(90deg, #f97316 0%, #f43f5e 100%)",
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-1">
                    {toNext} ELO до lvl {lvl.level + 1}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-zinc-900 to-rose-600/10 p-6 flex flex-col items-stretch justify-center min-w-[280px] gap-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400">
            Кастомные матчи
          </div>
          {canPlay ? (
            <Link
              href={`/${locale}/hub/create`}
              className="block w-full h-14 rounded font-black tracking-wide bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-400 hover:to-rose-500 transition-all flex items-center justify-center text-base"
            >
              СОЗДАТЬ МАТЧ
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title={
                bannedActive
                  ? "Вы забанены в hub"
                  : "Вы в cooldown за dodge/decline"
              }
              className="w-full h-14 rounded font-black tracking-wide bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
            >
              СОЗДАТЬ МАТЧ
            </button>
          )}
          <div className="text-[10px] font-mono text-zinc-500 text-center">
            Свои настройки · приглашения · BO1/3/5
          </div>
          {canPlay && (
            <details className="text-[11px] font-mono text-zinc-500 mt-1">
              <summary className="cursor-pointer hover:text-zinc-300 select-none">
                Или авто-matchmaking
              </summary>
              <div className="mt-2">
                <FindMatchButton locale={locale} />
              </div>
            </details>
          )}
        </div>
      </section>

      {/* Предупреждения о ban/cooldown */}
      {bannedActive && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm">
          <span className="font-bold text-rose-300">Бан в hub</span>
          <span className="text-rose-200/80">
            {" "}
            до {bannedActive.toLocaleString("ru-RU")}
            {user.hubBanReason ? ` — ${user.hubBanReason}` : ""}
          </span>
        </div>
      )}
      {!bannedActive && cooldownActive && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm">
          <span className="font-bold text-amber-300">Cooldown</span>
          <span className="text-amber-200/80">
            {" "}
            до {cooldownActive.toLocaleString("ru-RU")} — за dodge/decline ready-check
          </span>
        </div>
      )}

      {/* Party */}
      <PartyBlock
        meUserId={user.id}
        party={
          party
            ? {
                id: party.id,
                leaderId: party.leaderId,
                members: party.members,
                pendingInvites: party.pendingInvites,
              }
            : null
        }
        incoming={incomingInvites}
      />

      {/* Статы */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="ELO"
          value={String(user.hubElo)}
          accent="text-orange-300"
          hint={user.hubMatchesPlayed === 0 ? "стартовое" : undefined}
        />
        <Stat
          label="Wins"
          value={String(user.hubWins)}
          accent="text-emerald-300"
        />
        <Stat
          label="Losses"
          value={String(user.hubLosses)}
          accent="text-rose-300"
        />
        <Stat
          label="Winrate"
          value={wr === null ? "—" : `${wr}%`}
          accent={wr !== null && wr >= 50 ? "text-emerald-300" : "text-zinc-300"}
          hint={`${user.hubMatchesPlayed} матчей`}
        />
      </section>

      {/* Открытые матчи (mock — пока бекенд не подключён) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-orange-400">
            Открытые матчи
          </h2>
          <Link
            href={`/${locale}/hub/create`}
            className="text-[11px] font-mono text-orange-300 hover:text-orange-200"
          >
            + Создать свой →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              id: "demo-1",
              name: "Friday scrim",
              host: "Arsen",
              mode: "5 vs 5",
              format: "BO1",
              filled: 7,
              total: 10,
            },
            {
              id: "demo-2",
              name: "Quick duel",
              host: "Player_42",
              mode: "1 vs 1",
              format: "BO3",
              filled: 1,
              total: 2,
            },
            {
              id: "demo-3",
              name: "2v2 wingman",
              host: "Esports_KZ",
              mode: "2 vs 2",
              format: "BO3",
              filled: 3,
              total: 4,
            },
          ].map((m) => (
            <Link
              key={m.id}
              href={`/${locale}/hub/arena/${m.id}?name=${encodeURIComponent(
                m.name
              )}&mode=${
                m.mode === "1 vs 1"
                  ? "SOLO"
                  : m.mode === "2 vs 2"
                  ? "DUO"
                  : "FIVE"
              }&format=${m.format}&privacy=OPEN&pool=mirage,inferno,nuke,ancient,anubis,vertigo,dust2`}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-orange-500/40 p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-bold truncate">{m.name}</div>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                    m.filled === m.total
                      ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {m.filled}/{m.total}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/40">
                  {m.mode}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/40">
                  {m.format}
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500 mt-2">
                хост · {m.host}
              </div>
            </Link>
          ))}
        </div>
        <div className="text-[11px] font-mono text-zinc-600 mt-2">
          frontend-only превью · бекенд подключится когда переедете на сервер
        </div>
      </section>

      {/* Последние матчи */}
      <section>
        <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 mb-3">
          Последние матчи
        </h2>
        {recentMatches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-500">
            {canPlay
              ? "Ещё не сыграно ни одного матча в hub. Очередь откроется на этапе 2."
              : "Матчей нет — снимите бан/cooldown, чтобы играть."}
          </div>
        ) : (
          <div className="grid gap-2">
            {recentMatches.map((m) => {
              const wasTeamA = m.teamAPlayerIds.includes(user.steamId);
              const userTeam: "A" | "B" = wasTeamA ? "A" : "B";
              const userWon = m.winner === userTeam;
              return (
                <Link
                  key={m.id}
                  href={`/hub/match/${m.id}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 px-4 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        userWon
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/40"
                      }`}
                    >
                      {userWon ? "WIN" : "LOSS"}
                    </span>
                    <span className="text-sm font-medium">
                      {displayNameFor(m.map)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono tabular-nums">
                      {m.scoreA} : {m.scoreB}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 w-20 text-right">
                      {m.finishedAt ? formatRelative(m.finishedAt) : "—"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Подсказка о следующих этапах */}
      <section className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-5 py-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 mb-2">
          Дорожная карта MVP
        </div>
        <ul className="text-sm text-zinc-300 space-y-1 leading-relaxed">
          <li>
            <span className="text-emerald-400">✓</span> Этап 1 — Foundation: схема БД,
            профиль, дашборд
          </li>
          <li>
            <span className="text-emerald-400">✓</span> Этап 2 — Queue + Ready-check
          </li>
          <li>
            <span className="text-emerald-400">✓</span> Этап 3 — Лобби + капитаны + пик
          </li>
          <li>
            <span className="text-emerald-400">✓</span> Этап 4 — Map veto (BO1)
          </li>
          <li>
            <span className="text-emerald-400">✓</span> Этап 5 — Выделение сервера +
            MatchZy config
          </li>
          <li>
            <span className="text-zinc-500">○</span> Этап 6 — Реальный CS2 + RCON
            (отложен до боевого сервера)
          </li>
          <li>
            <span className="text-emerald-400">✓</span> Этап 7 — Результат + ELO
          </li>
          <li>
            <span className="text-emerald-400">✓</span> Этап 8 — Админ-панель hub
          </li>
        </ul>
      </section>
    </div>
  );
}
