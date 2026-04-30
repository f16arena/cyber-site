"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateDoubleElimination, shuffle } from "@/lib/bracket";
import type { Game, NewsCategory, TournamentFormat } from "@prisma/client";

export type ActionState = { ok?: boolean; error?: string };

const VALID_GAMES: Game[] = ["CS2", "DOTA2", "PUBG"];
const VALID_FORMATS: TournamentFormat[] = [
  "DOUBLE_ELIMINATION",
  "SINGLE_ELIMINATION",
  "ROUND_ROBIN",
  "BATTLE_ROYALE_SERIES",
];

// ─── TOURNAMENTS ────────────────────────────────────────

export async function createTournament(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const name = ((formData.get("name") as string | null) || "").trim();
  const slug = ((formData.get("slug") as string | null) || "").trim().toLowerCase();
  const game = formData.get("game") as string | null;
  const format = formData.get("format") as string | null;
  const prizeKzt = parseInt((formData.get("prize") as string | null) || "0", 10);
  const maxTeams = parseInt((formData.get("maxTeams") as string | null) || "16", 10);
  const description = ((formData.get("description") as string | null) || "").trim();
  const startsAtRaw = formData.get("startsAt") as string | null;
  const regCloseRaw = formData.get("registrationClosesAt") as string | null;

  if (name.length < 3 || name.length > 80) return { error: "Название: 3–80 символов" };
  if (!slug.match(/^[a-z0-9-]{3,40}$/))
    return { error: "Slug: 3–40 символов, латиница и дефисы" };
  if (!game || !VALID_GAMES.includes(game as Game)) return { error: "Выбери игру" };
  if (!format || !VALID_FORMATS.includes(format as TournamentFormat))
    return { error: "Выбери формат" };
  if (!Number.isFinite(prizeKzt) || prizeKzt < 0) return { error: "Призовой ≥ 0" };
  if (![4, 8, 16].includes(maxTeams)) return { error: "Команд: 4, 8 или 16" };

  const exists = await prisma.tournament.findUnique({ where: { slug } });
  if (exists) return { error: "Slug уже занят" };

  await prisma.tournament.create({
    data: {
      name,
      slug,
      game: game as Game,
      format: format as TournamentFormat,
      prize: BigInt(prizeKzt) * BigInt(100), // KZT → тиыны
      prizeCurrency: "KZT",
      maxTeams,
      description: description || null,
      status: "REGISTRATION_OPEN",
      startsAt: startsAtRaw ? new Date(startsAtRaw) : null,
      registrationClosesAt: regCloseRaw ? new Date(regCloseRaw) : null,
    },
  });

  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
  redirect("/admin/tournaments");
}

export async function registerTeam(formData: FormData) {
  "use server";
  const tournamentId = formData.get("tournamentId") as string | null;
  const teamId = formData.get("teamId") as string | null;
  if (!tournamentId || !teamId) return;

  // Это могут делать капитаны команд — проверка авторизации делается в UI
  await prisma.tournamentRegistration.upsert({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    create: { tournamentId, teamId, approvedAt: new Date() },
    update: { approvedAt: new Date() },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
}

export async function generateBracket(formData: FormData) {
  "use server";
  await requireAdmin();
  const tournamentId = formData.get("tournamentId") as string | null;
  if (!tournamentId) return;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        where: { approvedAt: { not: null } },
        include: { team: true },
      },
      matches: { take: 1 },
    },
  });

  if (!tournament) return;
  if (tournament.matches.length > 0) return; // сетка уже сгенерирована
  if (tournament.format !== "DOUBLE_ELIMINATION") return; // пока только DE

  const teamIds = shuffle(tournament.registrations.map((r) => r.teamId));
  if (teamIds.length < 2) return;

  const seeds = generateDoubleElimination(teamIds);

  // Создаём матчи в БД, помня соответствие "key → id"
  const keyToId = new Map<string, string>();

  // Первый проход: создаём матчи без parent-ссылок (foreign keys нужны существующие ID)
  // Сортируем так, чтобы родители были раньше детей
  const sortedSeeds = [...seeds].sort((a, b) => {
    const order = { UPPER: 0, LOWER: 1, GRAND_FINAL: 2 };
    if (a.side !== b.side) return order[a.side] - order[b.side];
    return a.round - b.round || a.position - b.position;
  });

  for (const seed of sortedSeeds) {
    const parentAId = seed.parentMatchAKey
      ? keyToId.get(seed.parentMatchAKey) ?? null
      : null;
    const parentBId = seed.parentMatchBKey
      ? keyToId.get(seed.parentMatchBKey) ?? null
      : null;

    const stage =
      seed.side === "GRAND_FINAL"
        ? "Grand Final"
        : seed.side === "UPPER"
          ? `UB Round ${seed.round}`
          : `LB Round ${seed.round}`;

    const created = await prisma.match.create({
      data: {
        tournamentId,
        teamAId: seed.teamAId,
        teamBId: seed.teamBId,
        bracketSide: seed.side === "GRAND_FINAL" ? "UPPER" : seed.side,
        round: seed.round,
        bracketPosition: seed.position,
        parentMatchAId: parentAId,
        parentMatchBId: parentBId,
        bestOf: seed.side === "GRAND_FINAL" ? 5 : 3,
        stage,
        status: "SCHEDULED",
      },
    });
    keyToId.set(seed.key, created.id);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "ONGOING" },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  revalidatePath(`/tournaments/${tournament.slug}`);
}

export async function setMatchResult(formData: FormData) {
  "use server";
  await requireAdmin();
  const matchId = formData.get("matchId") as string | null;
  const scoreA = parseInt((formData.get("scoreA") as string | null) || "0", 10);
  const scoreB = parseInt((formData.get("scoreB") as string | null) || "0", 10);
  const map = ((formData.get("map") as string | null) || "").trim();

  if (!matchId) return;
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { teamA: true, teamB: true },
  });
  if (!match) return;

  const winnerId =
    scoreA > scoreB
      ? match.teamAId
      : scoreB > scoreA
        ? match.teamBId
        : null;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      scoreA,
      scoreB,
      map: map || null,
      winnerId,
      status: "FINISHED",
      finishedAt: new Date(),
    },
  });

  // Авто-продвижение победителя в зависимый матч (children)
  if (winnerId && match.tournamentId) {
    await prisma.match.updateMany({
      where: { parentMatchAId: matchId },
      data: { teamAId: winnerId },
    });
    await prisma.match.updateMany({
      where: { parentMatchBId: matchId },
      data: { teamBId: winnerId },
    });
  }

  revalidatePath(`/admin/matches/${matchId}`);
  if (match.tournamentId) {
    revalidatePath(`/admin/tournaments/${match.tournamentId}`);
  }
}

export async function recordPlayerStat(formData: FormData) {
  "use server";
  await requireAdmin();
  const matchId = formData.get("matchId") as string | null;
  const userId = formData.get("userId") as string | null;
  const teamId = formData.get("teamId") as string | null;
  const game = formData.get("game") as string | null;

  if (!matchId || !userId || !teamId || !game) return;

  const kills = parseInt((formData.get("kills") as string) || "0", 10);
  const deaths = parseInt((formData.get("deaths") as string) || "0", 10);
  const assists = parseInt((formData.get("assists") as string) || "0", 10);
  const adr = parseFloat((formData.get("adr") as string) || "0");
  const hsPct = parseFloat((formData.get("hsPct") as string) || "0");
  const kast = parseFloat((formData.get("kast") as string) || "0");
  const isMvp = formData.get("isMvp") === "on";

  // Простая HLTV-style формула Rating 2.0 (упрощённая)
  // r = 0.0073*KAST + 0.3591*KPR - 0.5329*DPR + 0.2372*Impact + 0.0032*ADR + 0.1587
  // Без раундов — упрощённо: rating = (kills/deaths)*0.5 + ADR/100*0.3 + KAST/100*0.2
  const rating =
    (kills / Math.max(deaths, 1)) * 0.5 +
    (adr / 100) * 0.3 +
    (kast / 100) * 0.2;

  const extra: Record<string, number> = {};
  if (game === "CS2") {
    if (adr) extra.adr = adr;
    if (hsPct) extra.hsPct = hsPct;
    if (kast) extra.kast = kast;
  }

  await prisma.matchPlayerStat.upsert({
    where: { matchId_userId: { matchId, userId } },
    create: {
      matchId,
      userId,
      teamId,
      game: game as Game,
      kills,
      deaths,
      assists,
      rating,
      extra,
      isMvp,
    },
    update: {
      kills,
      deaths,
      assists,
      rating,
      extra,
      isMvp,
    },
  });

  if (isMvp) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { tournamentId: true },
    });
    await prisma.mvpAward.upsert({
      where: { matchId },
      create: {
        userId,
        matchId,
        tournamentId: match?.tournamentId ?? null,
      },
      update: { userId },
    });
  }

  revalidatePath(`/admin/matches/${matchId}`);
}

// ─── USERS ──────────────────────────────────────────────

export async function toggleAdmin(formData: FormData) {
  "use server";
  await requireAdmin();
  const userId = formData.get("userId") as string | null;
  if (!userId) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!target) return;

  await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: !target.isAdmin },
  });

  revalidatePath("/admin/users");
}

// ─── FACEIT IMPORT (skeleton) ───────────────────────────

/**
 * Импорт статистики матча с FACEIT.
 * Принимает FACEIT match ID (например "1-abc-123") и пуллит статы через FACEIT Data API.
 *
 * ⚠ TODO: добавить FACEIT_API_KEY в env vars (получить на https://developers.faceit.com)
 * Endpoints:
 *   GET https://open.faceit.com/data/v4/matches/{match_id}
 *   GET https://open.faceit.com/data/v4/matches/{match_id}/stats
 *
 * Ответ stats содержит per-player:
 *   - Kills, Deaths, Assists, Headshots %, K/R Ratio, ADR, MVPs
 *   - Имя игрока матчится через playerId / nickname
 *
 * Шаги функции:
 *   1. Парсим matchUrl или matchId
 *   2. Делаем fetch на FACEIT API
 *   3. Для каждого игрока в нашем матче — ищем по nickname или steamId
 *   4. upsert MatchPlayerStat с рассчитанным rating
 *   5. Сохраняем счёт по картам
 */
export async function importFaceitMatch(formData: FormData): Promise<void> {
  "use server";
  await requireAdmin();

  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    console.warn("FACEIT_API_KEY не настроен. developers.faceit.com");
    return;
  }

  const matchUrlOrId = ((formData.get("faceitMatch") as string) || "").trim();
  if (!matchUrlOrId) return;

  const matchIdMatch = matchUrlOrId.match(/(?:room\/)?(1-[a-z0-9-]+)/i);
  const matchId = matchIdMatch?.[1] ?? matchUrlOrId;

  try {
    const response = await fetch(
      `https://open.faceit.com/data/v4/matches/${matchId}/stats`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.warn(`FACEIT API: ${response.status} ${response.statusText}`);
      return;
    }

    // TODO: распарсить data.rounds[0].teams[*].players[*] и заполнить MatchPlayerStat
    // const data = await response.json();
  } catch (e) {
    console.error(`FACEIT import error: ${(e as Error).message}`);
  }
}

// ─── NEWS ───────────────────────────────────────────────

export async function createNews(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const title = ((formData.get("title") as string) || "").trim();
  const slug = ((formData.get("slug") as string) || "").trim().toLowerCase();
  const excerpt = ((formData.get("excerpt") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const category = formData.get("category") as string | null;
  const game = formData.get("game") as string | null;
  const publishNow = formData.get("publishNow") === "on";

  if (title.length < 3 || title.length > 200)
    return { error: "Заголовок: 3–200 символов" };
  if (!slug.match(/^[a-z0-9-]{3,80}$/))
    return { error: "Slug: 3–80 символов, латиница и дефисы" };
  if (body.length < 10) return { error: "Текст: минимум 10 символов" };

  const validCategories: NewsCategory[] = [
    "TOURNAMENT", "MVP", "SPONSOR", "TEAM", "GENERAL",
  ];
  const cat = validCategories.includes(category as NewsCategory)
    ? (category as NewsCategory)
    : "GENERAL";

  const exists = await prisma.news.findUnique({ where: { slug } });
  if (exists) return { error: "Slug уже занят" };

  await prisma.news.create({
    data: {
      title,
      slug,
      excerpt: excerpt || null,
      body,
      category: cat,
      game: game && VALID_GAMES.includes(game as Game) ? (game as Game) : null,
      authorId: admin.id,
      publishedAt: publishNow ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/news");
  redirect("/admin/news");
}
