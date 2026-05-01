"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateDoubleElimination, shuffle } from "@/lib/bracket";
import { uploadImage, deleteImage } from "@/lib/storage";
import { notify } from "@/lib/notifications";
import { translateAll } from "@/lib/translate";
import { emailMvpAwarded } from "@/lib/email";
import { logAdminAction } from "@/lib/audit";
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

  // Уведомляем капитана команды
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captainId: true, name: true },
  });
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { name: true, slug: true },
  });
  if (team && tournament) {
    await notify({
      userId: team.captainId,
      type: "TOURNAMENT_REGISTERED",
      title: `${team.name} зарегистрирована в турнире`,
      body: tournament.name,
      link: `/tournaments/${tournament.slug}`,
    });
  }

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
      select: { tournamentId: true, tournament: { select: { name: true } } },
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
    await notify({
      userId,
      type: "MVP_AWARDED",
      title: "⭐ Ты получил MVP матча!",
      body: match?.tournament?.name
        ? `Турнир: ${match.tournament.name}`
        : undefined,
      link: `/matches/${matchId}`,
    });
    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true, emailNotifications: true },
    });
    if (recipient?.email && recipient.emailNotifications) {
      const siteUrl = process.env.SITE_URL || "https://cyber-site-five.vercel.app";
      emailMvpAwarded(
        recipient.email,
        recipient.username,
        `${siteUrl}/matches/${matchId}`,
        match?.tournament?.name ?? undefined
      ).catch(() => {});
    }
  }

  revalidatePath(`/admin/matches/${matchId}`);
}

export async function uploadTournamentBanner(
  formData: FormData
): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const tournamentId = formData.get("tournamentId") as string | null;
  const file = formData.get("file") as File | null;
  if (!tournamentId || !file || file.size === 0) return { error: "Файл не выбран" };

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { bannerUrl: true },
  });
  if (!tournament) return { error: "Турнир не найден" };

  // banners в bucket team-logos (unified bucket для всех картинок турниров/команд)
  const result = await uploadImage("team-logos", `tournament-${tournamentId}`, file);
  if (!result.ok) return { error: result.error };

  if (tournament.bannerUrl) {
    await deleteImage("team-logos", tournament.bannerUrl).catch(() => {});
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { bannerUrl: result.publicUrl },
  });

  revalidatePath(`/admin/tournaments/${tournamentId}`);
  return { ok: true };
}

/**
 * Импорт статистики Dota 2 матча через OpenDota API.
 * https://api.opendota.com/api/matches/{match_id}
 *
 * OpenDota не требует ключа для базовых запросов (rate limit 60/мин),
 * но с OPENDOTA_API_KEY лимит выше.
 *
 * Ответ содержит per-player массив с полями:
 *   - account_id, hero_id, kills, deaths, assists
 *   - gold_per_min, xp_per_min
 *   - last_hits, denies
 *   - hero_damage, tower_damage, hero_healing
 *
 * Маппинг steamId → openDota account_id:
 *   account_id = steamId - 76561197960265728
 */
type OpenDotaMatch = {
  match_id: number;
  radiant_win: boolean;
  duration: number;
  radiant_score: number;
  dire_score: number;
  players: Array<{
    account_id?: number;
    hero_id: number;
    player_slot: number; // 0-127 = Radiant, 128-255 = Dire
    kills: number;
    deaths: number;
    assists: number;
    gold_per_min?: number;
    xp_per_min?: number;
    last_hits?: number;
    denies?: number;
    hero_damage?: number;
    tower_damage?: number;
    hero_healing?: number;
    personaname?: string;
  }>;
};

/** account_id (Dota 32-bit) → SteamID64 */
function accountIdToSteamId(accountId: number): string {
  const STEAM_ID_64_BASE = BigInt("76561197960265728");
  return (BigInt(accountId) + STEAM_ID_64_BASE).toString();
}

/**
 * Импорт Dota 2 матча через OpenDota API.
 * Маппинг: account_id → SteamID64 → User.steamId.
 */
export async function importOpenDotaMatch(formData: FormData): Promise<void> {
  "use server";
  await requireAdmin();

  const ourMatchId = formData.get("matchId") as string | null;
  const matchUrlOrId = ((formData.get("opendotaMatch") as string) || "").trim();
  if (!matchUrlOrId || !ourMatchId) return;

  const idMatch = matchUrlOrId.match(/(?:matches\/)?(\d{8,12})/);
  const dotaId = idMatch?.[1] ?? matchUrlOrId;
  if (!/^\d{8,12}$/.test(dotaId)) {
    console.warn(`[opendota] not a match id: ${matchUrlOrId}`);
    return;
  }

  try {
    const apiKey = process.env.OPENDOTA_API_KEY;
    const url = apiKey
      ? `https://api.opendota.com/api/matches/${dotaId}?api_key=${apiKey}`
      : `https://api.opendota.com/api/matches/${dotaId}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      console.warn(`[opendota] ${response.status}: ${response.statusText}`);
      return;
    }
    const data = (await response.json()) as OpenDotaMatch;
    if (!data.players?.length) return;

    const ourMatch = await prisma.match.findUnique({
      where: { id: ourMatchId },
      select: { teamAId: true, teamBId: true },
    });
    if (!ourMatch) return;

    // Radiant = teamA, Dire = teamB по конвенции
    const teamAId = ourMatch.teamAId;
    const teamBId = ourMatch.teamBId;

    let bestRating = 0;
    let mvpUserId: string | null = null;

    for (const p of data.players) {
      if (!p.account_id) continue; // anonymous player

      const steamId = accountIdToSteamId(p.account_id);
      const user = await prisma.user.findUnique({
        where: { steamId },
        select: { id: true },
      });
      if (!user) continue;

      const isRadiant = (p.player_slot & 128) === 0;
      const teamId = isRadiant ? teamAId : teamBId;
      if (!teamId) continue;

      // Простая Rating-формула для Dota: KDA * impact via gpm
      const rating =
        ((p.kills + p.assists * 0.5) / Math.max(p.deaths, 1)) * 0.6 +
        ((p.gold_per_min ?? 0) / 600) * 0.4;

      await prisma.matchPlayerStat.upsert({
        where: { matchId_userId: { matchId: ourMatchId, userId: user.id } },
        create: {
          matchId: ourMatchId,
          userId: user.id,
          teamId,
          game: "DOTA2",
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          rating,
          extra: {
            heroId: p.hero_id,
            gpm: p.gold_per_min,
            xpm: p.xp_per_min,
            lastHits: p.last_hits,
            denies: p.denies,
            heroDamage: p.hero_damage,
            towerDamage: p.tower_damage,
            heroHealing: p.hero_healing,
            isRadiant,
            source: "opendota",
            dotaMatchId: dotaId,
          },
        },
        update: {
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          rating,
          extra: {
            heroId: p.hero_id,
            gpm: p.gold_per_min,
            xpm: p.xp_per_min,
            source: "opendota",
            dotaMatchId: dotaId,
          },
        },
      });

      // MVP — лучший по rating среди победившей стороны
      const isWinner = isRadiant === data.radiant_win;
      if (isWinner && rating > bestRating) {
        bestRating = rating;
        mvpUserId = user.id;
      }
    }

    // Обновляем счёт матча
    const winnerId = data.radiant_win ? teamAId : teamBId;
    await prisma.match.update({
      where: { id: ourMatchId },
      data: {
        scoreA: data.radiant_score,
        scoreB: data.dire_score,
        winnerId,
        status: "FINISHED",
        finishedAt: new Date(),
        resultProofUrl: `https://www.opendota.com/matches/${dotaId}`,
      },
    });

    // MVP для матча
    if (mvpUserId) {
      await prisma.matchPlayerStat.update({
        where: { matchId_userId: { matchId: ourMatchId, userId: mvpUserId } },
        data: { isMvp: true },
      });
      await prisma.mvpAward.upsert({
        where: { matchId: ourMatchId },
        create: {
          userId: mvpUserId,
          matchId: ourMatchId,
        },
        update: { userId: mvpUserId },
      });
    }

    // Авто-продвижение по сетке
    if (winnerId) {
      await prisma.match.updateMany({
        where: { parentMatchAId: ourMatchId },
        data: { teamAId: winnerId },
      });
      await prisma.match.updateMany({
        where: { parentMatchBId: ourMatchId },
        data: { teamBId: winnerId },
      });
    }

    revalidatePath(`/admin/matches/${ourMatchId}`);
    revalidatePath(`/matches/${ourMatchId}`);
  } catch (e) {
    console.error("[opendota] import error:", (e as Error).message);
  }
}

// ─── TOURNAMENT TEMPLATES ───────────────────────────────

export async function saveAsTemplate(formData: FormData): Promise<void> {
  "use server";
  const admin = await requireAdmin();
  const tournamentId = formData.get("tournamentId") as string | null;
  const templateName = ((formData.get("templateName") as string) || "").trim();
  if (!tournamentId || !templateName) return;

  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t) return;

  await prisma.tournamentTemplate.create({
    data: {
      name: templateName,
      game: t.game,
      format: t.format,
      prize: t.prize,
      maxTeams: t.maxTeams,
      description: t.description,
      rules: t.rules,
      createdById: admin.id,
    },
  });

  revalidatePath("/admin/tournaments");
  revalidatePath("/admin/tournaments/new");
}

export async function deleteTournamentTemplate(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return;
  await prisma.tournamentTemplate.delete({ where: { id } });
  revalidatePath("/admin/tournaments/new");
}

// ─── ADMIN: TEAMS ───────────────────────────────────────

export async function adminUpdateTeam(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const teamId = formData.get("teamId") as string | null;
  if (!teamId) return { error: "teamId отсутствует" };

  const name = ((formData.get("name") as string) || "").trim();
  const tag = ((formData.get("tag") as string) || "").trim().toUpperCase();
  const description = ((formData.get("description") as string) || "").trim();
  const privacy =
    (formData.get("privacy") as string) === "PRIVATE" ? "PRIVATE" : "PUBLIC";

  if (name.length < 2) return { error: "Название слишком короткое" };
  if (!tag.match(/^[A-Z0-9]{2,5}$/)) return { error: "Неверный тег" };

  await prisma.team.update({
    where: { id: teamId },
    data: {
      name,
      tag,
      description: description || null,
      privacy,
    },
  });

  revalidatePath(`/admin/teams`);
  revalidatePath(`/teams/${tag}`);
  return { ok: true };
}

export async function adminUploadTeamLogo(
  formData: FormData
): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const teamId = formData.get("teamId") as string | null;
  const file = formData.get("file") as File | null;
  if (!teamId || !file || file.size === 0) return { error: "Файл не выбран" };

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { logoUrl: true },
  });
  if (!team) return { error: "Команда не найдена" };

  const result = await uploadImage("team-logos", `team-${teamId}`, file);
  if (!result.ok) return { error: result.error };

  if (team.logoUrl) {
    await deleteImage("team-logos", team.logoUrl).catch(() => {});
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl: result.publicUrl },
  });

  revalidatePath(`/admin/teams/${teamId}`);
  return { ok: true };
}

export async function adminDeleteTeam(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const teamId = formData.get("teamId") as string | null;
  if (!teamId) return;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { name: true, tag: true, game: true },
  });
  await prisma.team.delete({ where: { id: teamId } });
  await logAdminAction({
    adminId: admin.id,
    action: "DELETE_TEAM",
    entity: "team",
    entityId: teamId,
    metadata: team ? { name: team.name, tag: team.tag, game: team.game } : undefined,
  });
  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}

// ─── ADMIN: SPONSORS ────────────────────────────────────

export async function adminUpdateSponsor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return { error: "id отсутствует" };

  const name = ((formData.get("name") as string) || "").trim();
  const tier = formData.get("tier") as string | null;
  const websiteUrl = ((formData.get("websiteUrl") as string) || "").trim();
  const monthlyFee = parseInt((formData.get("monthlyFeeKzt") as string) || "0", 10);
  const notes = ((formData.get("notes") as string) || "").trim();

  if (name.length < 2) return { error: "Название слишком короткое" };
  if (!tier || !["BRONZE", "SILVER", "GOLD", "PLATINUM"].includes(tier))
    return { error: "Неверный тир" };

  await prisma.sponsor.update({
    where: { id },
    data: {
      name,
      tier: tier as "BRONZE" | "SILVER" | "GOLD" | "PLATINUM",
      websiteUrl: websiteUrl || null,
      monthlyFeeKzt: monthlyFee || null,
      notes: notes || null,
    },
  });

  revalidatePath(`/admin/sponsors`);
  return { ok: true };
}

export async function adminUploadSponsorLogo(
  formData: FormData
): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const file = formData.get("file") as File | null;
  if (!id || !file || file.size === 0) return { error: "Файл не выбран" };

  const sponsor = await prisma.sponsor.findUnique({
    where: { id },
    select: { logoUrl: true },
  });
  if (!sponsor) return { error: "Спонсор не найден" };

  const result = await uploadImage("team-logos", `sponsor-${id}`, file);
  if (!result.ok) return { error: result.error };

  if (sponsor.logoUrl) {
    await deleteImage("team-logos", sponsor.logoUrl).catch(() => {});
  }

  await prisma.sponsor.update({
    where: { id },
    data: { logoUrl: result.publicUrl },
  });

  revalidatePath("/admin/sponsors");
  return { ok: true };
}

// ─── SPONSORS ───────────────────────────────────────────

export async function createSponsor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const name = ((formData.get("name") as string) || "").trim();
  const tier = formData.get("tier") as string | null;
  const websiteUrl = ((formData.get("websiteUrl") as string) || "").trim();
  const logoUrl = ((formData.get("logoUrl") as string) || "").trim();
  const monthlyFee = parseInt((formData.get("monthlyFeeKzt") as string) || "0", 10);
  const notes = ((formData.get("notes") as string) || "").trim();

  if (name.length < 2) return { error: "Название не короче 2 символов" };
  const validTiers = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
  if (!tier || !validTiers.includes(tier)) return { error: "Выбери тир" };

  await prisma.sponsor.create({
    data: {
      name,
      tier: tier as "BRONZE" | "SILVER" | "GOLD" | "PLATINUM",
      websiteUrl: websiteUrl || null,
      logoUrl: logoUrl || null,
      monthlyFeeKzt: monthlyFee || null,
      notes: notes || null,
      contractStart: new Date(),
    },
  });

  revalidatePath("/admin/sponsors");
  redirect("/admin/sponsors");
}

export async function toggleSponsorActive(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return;
  const s = await prisma.sponsor.findUnique({ where: { id }, select: { isActive: true } });
  if (!s) return;
  await prisma.sponsor.update({
    where: { id },
    data: { isActive: !s.isActive },
  });
  revalidatePath("/admin/sponsors");
}

export async function deleteSponsor(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return;
  await prisma.sponsor.delete({ where: { id } });
  revalidatePath("/admin/sponsors");
}

export async function markInquiryHandled(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return;
  await prisma.sponsorshipInquiry.update({
    where: { id },
    data: { isHandled: true },
  });
  revalidatePath("/admin/inquiries");
}

// ─── SEASONS ────────────────────────────────────────────

export async function createSeason(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const name = ((formData.get("name") as string) || "").trim();
  const slug = ((formData.get("slug") as string) || "").trim().toLowerCase();
  const game = formData.get("game") as string | null;
  const startsAt = formData.get("startsAt") as string | null;
  const endsAt = formData.get("endsAt") as string | null;

  if (name.length < 3) return { error: "Название не короче 3 символов" };
  if (!slug.match(/^[a-z0-9-]{3,40}$/))
    return { error: "Slug: 3–40 символов, латиница/дефисы" };
  if (!startsAt || !endsAt) return { error: "Укажи даты начала и конца" };

  const exists = await prisma.season.findUnique({ where: { slug } });
  if (exists) return { error: "Slug занят" };

  await prisma.season.create({
    data: {
      name,
      slug,
      game: game && VALID_GAMES.includes(game as Game) ? (game as Game) : null,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    },
  });

  revalidatePath("/admin/seasons");
  redirect("/admin/seasons");
}

// ─── USERS ──────────────────────────────────────────────

export async function toggleAdmin(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string | null;
  if (!userId) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, username: true },
  });
  if (!target) return;

  await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: !target.isAdmin },
  });

  await logAdminAction({
    adminId: admin.id,
    action: target.isAdmin ? "REVOKE_ADMIN" : "GRANT_ADMIN",
    entity: "user",
    entityId: userId,
    metadata: { username: target.username },
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
type FaceitStats = {
  rounds: Array<{
    teams: Array<{
      team_id: string;
      team_stats: { Score?: string; "Final Score"?: string };
      players: Array<{
        player_id: string;
        nickname: string;
        player_stats: Record<string, string>;
      }>;
    }>;
  }>;
};

/**
 * Импорт CS2-матча с FACEIT.
 * URL формата https://www.faceit.com/en/cs2/room/1-abc-123 или просто "1-abc-123".
 *
 * Маппинг игроков: ищем User по username == FACEIT nickname (case-insensitive).
 * Если не найдено — игрок пропускается (можно потом сматчить вручную).
 */
export async function importFaceitMatch(formData: FormData): Promise<void> {
  "use server";
  await requireAdmin();

  const apiKey = process.env.FACEIT_API_KEY;
  if (!apiKey) {
    console.warn("[faceit] API key not set");
    return;
  }

  const ourMatchId = formData.get("matchId") as string | null;
  const matchUrlOrId = ((formData.get("faceitMatch") as string) || "").trim();
  if (!matchUrlOrId || !ourMatchId) return;

  const matchIdMatch = matchUrlOrId.match(/(?:room\/)?(1-[a-z0-9-]+)/i);
  const faceitId = matchIdMatch?.[1] ?? matchUrlOrId;

  try {
    const response = await fetch(
      `https://open.faceit.com/data/v4/matches/${faceitId}/stats`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      }
    );
    if (!response.ok) {
      console.warn(`[faceit] ${response.status}: ${response.statusText}`);
      return;
    }
    const data = (await response.json()) as FaceitStats;
    if (!data.rounds?.length) return;

    const ourMatch = await prisma.match.findUnique({
      where: { id: ourMatchId },
      select: { teamAId: true, teamBId: true, tournamentId: true },
    });
    if (!ourMatch) return;

    let totalScoreA = 0;
    let totalScoreB = 0;

    for (const round of data.rounds) {
      // Каждой FACEIT-команде проставляем score нашей команде по индексу
      const [teamA, teamB] = round.teams;
      const scoreA = parseInt(
        teamA.team_stats?.["Final Score"] ?? teamA.team_stats?.Score ?? "0",
        10
      );
      const scoreB = parseInt(
        teamB.team_stats?.["Final Score"] ?? teamB.team_stats?.Score ?? "0",
        10
      );
      totalScoreA += isNaN(scoreA) ? 0 : scoreA;
      totalScoreB += isNaN(scoreB) ? 0 : scoreB;

      // Players
      for (const [teamIdx, faceitTeam] of [teamA, teamB].entries()) {
        const ourTeamId = teamIdx === 0 ? ourMatch.teamAId : ourMatch.teamBId;
        if (!ourTeamId) continue;

        for (const p of faceitTeam.players) {
          // Маппинг по nickname (case-insensitive)
          const user = await prisma.user.findFirst({
            where: { username: { equals: p.nickname, mode: "insensitive" } },
            select: { id: true },
          });
          if (!user) continue;

          const stats = p.player_stats || {};
          const kills = parseInt(stats.Kills || "0", 10);
          const deaths = parseInt(stats.Deaths || "0", 10);
          const assists = parseInt(stats.Assists || "0", 10);
          const mvps = parseInt(stats.MVPs || "0", 10);
          const hsPct = parseFloat(stats["Headshots %"] || "0");
          const adr = parseFloat(stats.ADR || stats["Average Damage per Round"] || "0");

          // HLTV-style rating (упрощённо)
          const rating =
            (kills / Math.max(deaths, 1)) * 0.5 +
            (adr / 100) * 0.3 +
            (hsPct / 100) * 0.2;

          await prisma.matchPlayerStat.upsert({
            where: { matchId_userId: { matchId: ourMatchId, userId: user.id } },
            create: {
              matchId: ourMatchId,
              userId: user.id,
              teamId: ourTeamId,
              game: "CS2",
              kills,
              deaths,
              assists,
              mvpRounds: mvps,
              rating,
              extra: {
                hsPct,
                adr,
                kdRatio: parseFloat(stats["K/D Ratio"] || "0"),
                krRatio: parseFloat(stats["K/R Ratio"] || "0"),
                triplekills: parseInt(stats["Triple Kills"] || "0", 10),
                quadrokills: parseInt(stats.Quadro || "0", 10),
                pentakills: parseInt(stats.Penta || "0", 10),
                source: "faceit",
                faceitId,
              },
            },
            update: {
              kills,
              deaths,
              assists,
              mvpRounds: mvps,
              rating,
              extra: {
                hsPct,
                adr,
                source: "faceit",
                faceitId,
              },
            },
          });
        }
      }
    }

    // Обновляем счёт матча
    if (totalScoreA + totalScoreB > 0) {
      const winnerId =
        totalScoreA > totalScoreB
          ? ourMatch.teamAId
          : totalScoreB > totalScoreA
            ? ourMatch.teamBId
            : null;
      await prisma.match.update({
        where: { id: ourMatchId },
        data: {
          scoreA: totalScoreA,
          scoreB: totalScoreB,
          winnerId,
          status: "FINISHED",
          finishedAt: new Date(),
          resultProofUrl: `https://www.faceit.com/en/cs2/room/${faceitId}`,
        },
      });

      // Авто-продвижение по сетке
      if (winnerId) {
        await prisma.match.updateMany({
          where: { parentMatchAId: ourMatchId },
          data: { teamAId: winnerId },
        });
        await prisma.match.updateMany({
          where: { parentMatchBId: ourMatchId },
          data: { teamBId: winnerId },
        });
      }
    }

    revalidatePath(`/admin/matches/${ourMatchId}`);
    revalidatePath(`/matches/${ourMatchId}`);
  } catch (e) {
    console.error("[faceit] import error:", (e as Error).message);
  }
}

// ─── WORLD NEWS ─────────────────────────────────────────

export async function createWorldNews(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const title = ((formData.get("title") as string) || "").trim();
  const excerpt = ((formData.get("excerpt") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const game = formData.get("game") as string | null;
  const category = (formData.get("category") as string) || "GENERAL";
  const sourceName = ((formData.get("sourceName") as string) || "").trim();
  const sourceUrl = ((formData.get("sourceUrl") as string) || "").trim();
  const imageUrl = ((formData.get("imageUrl") as string) || "").trim();
  const originalLang = ((formData.get("originalLang") as string) || "en") as
    | "ru"
    | "kk"
    | "en";
  const autoTranslate = formData.get("autoTranslate") === "on";

  if (title.length < 3) return { error: "Заголовок слишком короткий" };
  if (body.length < 10) return { error: "Текст слишком короткий" };

  const validCategories = [
    "TOURNAMENT_RESULT",
    "TRANSFER",
    "ROSTER_CHANGE",
    "ANNOUNCEMENT",
    "GENERAL",
  ];
  const cat = validCategories.includes(category) ? category : "GENERAL";

  let translations: Record<string, { title: string; excerpt: string | null; body: string }> | null = null;
  if (autoTranslate) {
    try {
      translations = await translateAll(
        { title, excerpt: excerpt || null, body },
        originalLang
      );
    } catch (e) {
      console.warn("translateAll failed:", (e as Error).message);
    }
  }

  await prisma.worldNews.create({
    data: {
      title,
      excerpt: excerpt || null,
      body,
      game: game && VALID_GAMES.includes(game as Game) ? (game as Game) : null,
      category: cat as
        | "TOURNAMENT_RESULT"
        | "TRANSFER"
        | "ROSTER_CHANGE"
        | "ANNOUNCEMENT"
        | "GENERAL",
      sourceName: sourceName || null,
      sourceUrl: sourceUrl || null,
      imageUrl: imageUrl || null,
      originalLang,
      translations: translations ?? undefined,
      publishedAt: new Date(),
      isPublished: true,
    },
  });

  revalidatePath("/world-news");
  revalidatePath("/admin/world-news");
  redirect("/admin/world-news");
}

export async function deleteWorldNews(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return;
  await prisma.worldNews.delete({ where: { id } });
  revalidatePath("/admin/world-news");
  revalidatePath("/world-news");
}

export async function uploadNewsCover(formData: FormData): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const newsId = formData.get("newsId") as string | null;
  const file = formData.get("file") as File | null;
  if (!newsId || !file || file.size === 0) return { error: "Файл не выбран" };

  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: { coverUrl: true },
  });
  if (!news) return { error: "Новость не найдена" };

  const result = await uploadImage("team-logos", `news-${newsId}`, file);
  if (!result.ok) return { error: result.error };

  if (news.coverUrl) {
    await deleteImage("team-logos", news.coverUrl).catch(() => {});
  }

  await prisma.news.update({
    where: { id: newsId },
    data: { coverUrl: result.publicUrl },
  });

  revalidatePath("/admin/news");
  revalidatePath("/news");
  return { ok: true };
}

export async function uploadWorldNewsCover(
  formData: FormData
): Promise<ActionState> {
  "use server";
  await requireAdmin();
  const id = formData.get("id") as string | null;
  const file = formData.get("file") as File | null;
  if (!id || !file || file.size === 0) return { error: "Файл не выбран" };

  const item = await prisma.worldNews.findUnique({
    where: { id },
    select: { imageUrl: true },
  });
  if (!item) return { error: "Не найдено" };

  const result = await uploadImage("team-logos", `world-news-${id}`, file);
  if (!result.ok) return { error: result.error };

  if (item.imageUrl) {
    await deleteImage("team-logos", item.imageUrl).catch(() => {});
  }

  await prisma.worldNews.update({
    where: { id },
    data: { imageUrl: result.publicUrl },
  });

  revalidatePath("/admin/world-news");
  revalidatePath("/world-news");
  return { ok: true };
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
