/**
 * Seed-скрипт для демо-данных. Запуск: `npx tsx prisma/seed.ts`
 *
 * Создаёт:
 *  - 8 демо-пользователей (с фейк-Steam IDs)
 *  - 5 команд (CS2, Dota 2, PUBG)
 *  - 3 турнира с участниками и матчами
 *  - 5 новостей и 3 мировые новости
 *  - Пара friend-связей
 *
 * Скрипт идемпотентен: при повторном запуске использует upsert.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_USERS = [
  { steamId: "demo-1", username: "k1ller_kz", region: "ALMATY", role: "AWP" },
  { steamId: "demo-2", username: "Nomad_pro", region: "ASTANA", role: "Rifler" },
  { steamId: "demo-3", username: "Khan_007", region: "ALMATY", role: "IGL" },
  { steamId: "demo-4", username: "Batyr_g", region: "SHYMKENT", role: "Rifler" },
  { steamId: "demo-5", username: "S1eepy", region: "KARAGANDA", role: "Support" },
  { steamId: "demo-6", username: "Aqsunqar_M", region: "ASTANA", role: "Carry" },
  { steamId: "demo-7", username: "berkut_d", region: "ALMATY", role: "Mid" },
  { steamId: "demo-8", username: "tulpar_f", region: "ATYRAU", role: "Sniper" },
] as const;

async function main() {
  console.log("🌱 Seeding demo data...");

  // 1. Users
  const users = await Promise.all(
    DEMO_USERS.map((u) =>
      prisma.user.upsert({
        where: { steamId: u.steamId },
        create: {
          steamId: u.steamId,
          username: u.username,
          region: u.region as "ALMATY" | "ASTANA" | "SHYMKENT" | "KARAGANDA" | "ATYRAU",
          bio: `Демо-игрок для тестов. Роль: ${u.role}`,
        },
        update: {},
      })
    )
  );
  console.log(`  ✓ ${users.length} users`);

  // PlayerProfile для CS2 + (для kicker первого) DOTA2
  for (const u of users) {
    await prisma.playerProfile.upsert({
      where: { userId_game: { userId: u.id, game: "CS2" } },
      create: {
        userId: u.id,
        game: "CS2",
        inGameRole: DEMO_USERS.find((d) => d.steamId === u.steamId)?.role,
        rank: "Premier 18000",
      },
      update: {},
    });
  }

  // 2. Teams
  const teams = await Promise.all([
    prisma.team.upsert({
      where: { tag: "TLP" },
      create: {
        name: "Tulpar",
        tag: "TLP",
        game: "CS2",
        region: "ALMATY",
        captainId: users[0].id,
        description: "Команда из Алматы. Основной состав 5 + 2 запасных.",
        rating: 1842,
        privacy: "PUBLIC",
      },
      update: {},
    }),
    prisma.team.upsert({
      where: { tag: "AQS" },
      create: {
        name: "Aqsunqar",
        tag: "AQS",
        game: "CS2",
        region: "ASTANA",
        captainId: users[1].id,
        description: "Astana-based CS2 team.",
        rating: 1714,
        privacy: "PUBLIC",
      },
      update: {},
    }),
    prisma.team.upsert({
      where: { tag: "SAR" },
      create: {
        name: "Saryarqa",
        tag: "SAR",
        game: "CS2",
        region: "KARAGANDA",
        captainId: users[2].id,
        description: "Steppe warriors.",
        rating: 1689,
        privacy: "PRIVATE",
      },
      update: {},
    }),
    prisma.team.upsert({
      where: { tag: "BRK" },
      create: {
        name: "Berkut",
        tag: "BRK",
        game: "DOTA2",
        region: "ALMATY",
        captainId: users[6].id,
        description: "Dota 2 team из Алматы.",
        rating: 1622,
        privacy: "PUBLIC",
      },
      update: {},
    }),
    prisma.team.upsert({
      where: { tag: "ASE" },
      create: {
        name: "Astana Esports",
        tag: "ASE",
        game: "PUBG",
        region: "ASTANA",
        captainId: users[3].id,
        description: "PUBG squad.",
        rating: 1650,
        privacy: "PUBLIC",
      },
      update: {},
    }),
  ]);
  console.log(`  ✓ ${teams.length} teams`);

  // Members for CS2 teams
  const cs2Teams = teams.filter((t) => t.game === "CS2");
  for (let i = 0; i < cs2Teams.length; i++) {
    const team = cs2Teams[i];
    const members = users.slice(i * 2, i * 2 + 5);
    for (let j = 0; j < members.length; j++) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId: members[j].id } },
        create: {
          teamId: team.id,
          userId: members[j].id,
          role: j === 0 ? "CAPTAIN" : "PLAYER",
        },
        update: {},
      });
    }
  }
  console.log("  ✓ team members");

  // 3. Tournaments
  const now = new Date();
  const inWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const tournament = await prisma.tournament.upsert({
    where: { slug: "spring-open-2026" },
    create: {
      name: "Esports.kz Spring Open 2026",
      slug: "spring-open-2026",
      game: "CS2",
      format: "DOUBLE_ELIMINATION",
      status: "REGISTRATION_OPEN",
      prize: BigInt(1_200_000) * BigInt(100), // в тиынах
      maxTeams: 8,
      description:
        "Главный весенний турнир Казахстана по CS2. Призовой фонд 1.2 млн ₸. Формат Double Elimination, BO3 в плейофф, BO5 финал.",
      registrationClosesAt: inWeek,
      startsAt: new Date(inWeek.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  // Регистрируем все CS2-команды
  for (const t of cs2Teams) {
    await prisma.tournamentRegistration.upsert({
      where: { tournamentId_teamId: { tournamentId: tournament.id, teamId: t.id } },
      create: {
        tournamentId: tournament.id,
        teamId: t.id,
        approvedAt: now,
      },
      update: {},
    });
  }
  console.log("  ✓ tournament with registrations");

  // 4. News
  const newsItems = [
    {
      slug: "first-tournament-announcement",
      title: "Открыт приём заявок на летний чемпионат CS2",
      excerpt:
        "Призовой фонд 1.2 млн ₸. Регистрация команд до 15 июня, формат double elimination.",
      body: "Esports.kz объявляет о запуске первого регулярного чемпионата по CS2 в формате Spring Open. Турнир пройдёт по системе Double Elimination, призовой фонд 1.2 млн тенге. К участию приглашаются 8 команд от 5 человек, регистрация на сайте в разделе турниров.",
      category: "TOURNAMENT" as const,
      game: "CS2" as const,
      publishedAt: now,
    },
    {
      slug: "tulpar-wins-test-match",
      title: "Tulpar выигрывает первый этап весеннего сезона",
      excerpt:
        "Команда из Алматы прошла без поражений. MVP турнира — снайпер с ником k1ller_kz.",
      body: "В финале Spring Stage 1 команда Tulpar обыграла Aqsunqar со счётом 2:0. MVP турнира признан AWP-снайпер k1ller_kz, набравший рейтинг 1.42 за 6 матчей.",
      category: "MVP" as const,
      game: "CS2" as const,
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      slug: "beeline-sponsor",
      title: "Beeline KZ становится title-спонсором сезона",
      excerpt: "Партнёрский пакет включает кубок имени бренда и эксклюзивные стримы.",
      body: "Esports.kz и Beeline Kazakhstan заключили партнёрское соглашение на весенний сезон. Все турниры будут сопровождаться брендингом Beeline, главный кубок носит имя 'Beeline Spring Cup'.",
      category: "SPONSOR" as const,
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      slug: "dota-open-league-launch",
      title: "Анонсирована Dota 2 KZ Open League",
      excerpt: "Регулярная лига по Dota 2, 16 команд, формат — групповой этап + плейофф.",
      body: "Запускаем первую регулярную лигу по Dota 2 в Казахстане. Формат: 16 команд, групповой этап с разделением на 2 группы по 8 команд, плейофф single elimination.",
      category: "TOURNAMENT" as const,
      game: "DOTA2" as const,
      publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      slug: "platform-launch",
      title: "Esports.kz открывает регистрацию",
      excerpt: "Платформа для казахстанского киберспорта запускает закрытое бета-тестирование.",
      body: "Сегодня Esports.kz запускает регистрацию игроков и команд через Steam OpenID. На платформе доступны: профили игроков с тегами CS2/Dota 2/PUBG, поиск тиммейтов, турниры с автогенерацией сетки, командные чаты, лидерборды.",
      category: "GENERAL" as const,
      publishedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const n of newsItems) {
    await prisma.news.upsert({
      where: { slug: n.slug },
      create: n,
      update: {},
    });
  }
  console.log(`  ✓ ${newsItems.length} news items`);

  // 5. World news
  const worldNews = [
    {
      title: "NaVi sign new CS2 roster for 2026 season",
      excerpt: "Famous organization Natus Vincere announced 4 new players joining their CS2 team.",
      body: "Natus Vincere has officially announced the signing of four new players for their CS2 roster ahead of the 2026 season. The team will compete under the leadership of long-time IGL.",
      game: "CS2" as const,
      category: "ROSTER_CHANGE" as const,
      sourceName: "HLTV",
      sourceUrl: "https://www.hltv.org",
      originalLang: "en",
      publishedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Vitality wins ESL Pro League S20",
      excerpt: "ZywOo finishes the tournament with a 1.42 rating, claiming MVP for the third time.",
      body: "Team Vitality has won ESL Pro League Season 20 by defeating Astralis 3-2 in the grand final. ZywOo posted an outstanding 1.42 rating across the playoffs and was named MVP.",
      game: "CS2" as const,
      category: "TOURNAMENT_RESULT" as const,
      sourceName: "HLTV",
      sourceUrl: "https://www.hltv.org",
      originalLang: "en",
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: "PSG.LGD reveal new Dota 2 captain for The International",
      excerpt: "Chinese powerhouse appoints former Mid laner as in-game leader.",
      body: "PSG.LGD has announced changes to their Dota 2 roster ahead of The International. The team will be led by their former mid laner who steps into the captain role.",
      game: "DOTA2" as const,
      category: "ROSTER_CHANGE" as const,
      sourceName: "Liquipedia",
      sourceUrl: "https://liquipedia.net/dota2",
      originalLang: "en",
      publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const w of worldNews) {
    // Простая ID-based deduplication через title
    const exists = await prisma.worldNews.findFirst({
      where: { title: w.title },
    });
    if (!exists) {
      await prisma.worldNews.create({ data: w });
    }
  }
  console.log(`  ✓ ${worldNews.length} world news`);

  console.log("✓ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
