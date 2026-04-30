import Link from "next/link";
import { UserMenu } from "@/components/UserMenu";

const navLinks = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/matches", label: "Матчи" },
  { href: "/teams", label: "Команды" },
  { href: "/players", label: "Игроки" },
  { href: "/news", label: "Новости" },
  { href: "/streams", label: "Стримы" },
];

const games = [
  {
    code: "CS2",
    name: "Counter-Strike 2",
    format: "Double Elimination · 5v5",
    accent: "from-amber-400 via-orange-500 to-red-600",
    glow: "shadow-[0_0_60px_-15px_rgba(251,146,60,0.6)]",
    border: "hover:border-orange-500/60",
  },
  {
    code: "DOTA2",
    name: "Dota 2",
    format: "Single Elimination · 5v5",
    accent: "from-rose-500 via-red-600 to-red-800",
    glow: "shadow-[0_0_60px_-15px_rgba(244,63,94,0.6)]",
    border: "hover:border-rose-500/60",
  },
  {
    code: "PUBG",
    name: "PUBG",
    format: "Squad Battle Royale · 4v4",
    accent: "from-yellow-300 via-amber-500 to-yellow-600",
    glow: "shadow-[0_0_60px_-15px_rgba(250,204,21,0.6)]",
    border: "hover:border-yellow-500/60",
  },
];

const liveMatches = [
  {
    game: "CS2",
    teamA: { name: "Tulpar", score: 12, logo: "T" },
    teamB: { name: "Saryarqa", score: 7, logo: "S" },
    map: "Mirage",
    stage: "QCL · Полуфинал",
  },
  {
    game: "DOTA2",
    teamA: { name: "Aqsunqar", score: 1, logo: "A" },
    teamB: { name: "Berkut", score: 0, logo: "B" },
    map: "Game 2 · BO3",
    stage: "DPC KZ · Группа A",
  },
];

const upcomingMatches = [
  {
    game: "CS2",
    time: "Сегодня · 20:00",
    teamA: "Almaty Wolves",
    teamB: "Astana Esports",
    stage: "Чемпионат КЗ",
  },
  {
    game: "CS2",
    time: "Сегодня · 22:00",
    teamA: "Steppe Five",
    teamB: "Karaganda KZ",
    stage: "Чемпионат КЗ",
  },
  {
    game: "DOTA2",
    time: "Завтра · 18:30",
    teamA: "Nomad Gaming",
    teamB: "Aral Five",
    stage: "Группа B",
  },
  {
    game: "PUBG",
    time: "Завтра · 21:00",
    teamA: "Squad Astana",
    teamB: "Almaty Wolves",
    stage: "Финал серии",
  },
  {
    game: "CS2",
    time: "Сб · 19:00",
    teamA: "Tulpar",
    teamB: "Aqsunqar",
    stage: "Полуфинал · BO3",
  },
];

const recentResults = [
  {
    game: "CS2",
    teamA: { name: "Tulpar", score: 16, won: true },
    teamB: { name: "Beibarys", score: 11, won: false },
    when: "2ч назад",
    map: "Inferno",
  },
  {
    game: "DOTA2",
    teamA: { name: "Berkut", score: 2, won: true },
    teamB: { name: "Steppe Wolves", score: 0, won: false },
    when: "5ч назад",
    map: "BO3",
  },
  {
    game: "CS2",
    teamA: { name: "Aqsunqar", score: 13, won: false },
    teamB: { name: "Astana Esports", score: 16, won: true },
    when: "Вчера",
    map: "Anubis",
  },
];

const newsFeed = [
  {
    tag: "ТУРНИРЫ",
    title: "Открыт приём заявок на летний чемпионат CS2",
    excerpt:
      "Призовой фонд 1.2 млн ₸. Регистрация команд до 15 июня, формат double elimination.",
    time: "1ч назад",
    accent: "border-l-violet-500",
    badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  {
    tag: "MVP",
    title: "Tulpar выигрывает первый этап весеннего сезона",
    excerpt:
      "Команда из Алматы прошла без поражений. MVP турнира — снайпер с ником k1ller_kz.",
    time: "5ч назад",
    accent: "border-l-amber-500",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  {
    tag: "СПОНСОРЫ",
    title: "Beeline KZ становится title-спонсором сезона",
    excerpt:
      "Партнёрский пакет включает кубок имени бренда и эксклюзивные стримы.",
    time: "Вчера",
    accent: "border-l-fuchsia-500",
    badgeColor: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  },
  {
    tag: "DOTA 2",
    title: "Анонсирована Dota 2 KZ Open League",
    excerpt:
      "Регулярная лига по Dota 2, 16 команд, формат — групповой этап + плейофф.",
    time: "2 дня назад",
    accent: "border-l-rose-500",
    badgeColor: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
];

const topTeams = [
  { rank: 1, name: "Tulpar", points: 1842, change: "+24", country: "🇰🇿" },
  { rank: 2, name: "Aqsunqar", points: 1714, change: "+8", country: "🇰🇿" },
  { rank: 3, name: "Saryarqa", points: 1689, change: "-12", country: "🇰🇿" },
  { rank: 4, name: "Astana Esports", points: 1650, change: "+5", country: "🇰🇿" },
  { rank: 5, name: "Berkut", points: 1622, change: "0", country: "🇰🇿" },
];

const topPlayers = [
  { rank: 1, nick: "k1ller_kz", team: "Tulpar", rating: "1.34", role: "AWP" },
  { rank: 2, nick: "Nomad", team: "Aqsunqar", rating: "1.28", role: "Rifler" },
  { rank: 3, nick: "Khan", team: "Saryarqa", rating: "1.21", role: "IGL" },
  { rank: 4, nick: "Batyr", team: "Astana", rating: "1.17", role: "Rifler" },
  { rank: 5, nick: "S1eepy", team: "Berkut", rating: "1.14", role: "Support" },
];

const featuredTournament = {
  name: "Esports.kz Spring Open 2026",
  game: "CS2",
  prize: "1 200 000 ₸",
  teams: 16,
  status: "Идёт регистрация",
  daysLeft: 12,
};

const sponsorTiers = [
  {
    name: "БРОНЗА",
    kz: "Жез",
    price: "от 50 000 ₸",
    perks: ["Лого в подвале", "Упоминание в 1 турнире/мес"],
    accent: "from-amber-700 to-amber-900",
    border: "border-amber-700/40",
  },
  {
    name: "СЕРЕБРО",
    kz: "Күміс",
    price: "от 200 000 ₸",
    perks: ["Лого на главной", "Бренд в 2 турнирах", "Пост в соцсетях"],
    accent: "from-zinc-300 to-zinc-500",
    border: "border-zinc-400/40",
  },
  {
    name: "ЗОЛОТО",
    kz: "Алтын",
    price: "от 500 000 ₸",
    perks: ["Title-спонсор турнира", "Баннер на стримах", "Кубок имени бренда"],
    accent: "from-yellow-300 to-amber-600",
    border: "border-amber-400/50",
    featured: true,
  },
  {
    name: "ПЛАТИНА",
    kz: "Platinum",
    price: "по запросу",
    perks: ["Эксклюзив на сезон", "Ко-брендинг", "Кастомная активация"],
    accent: "from-violet-300 to-fuchsia-500",
    border: "border-violet-400/50",
  },
];

function GameTag({ code }: { code: string }) {
  const colors: Record<string, string> = {
    CS2: "bg-orange-500/15 text-orange-300 border-orange-500/40",
    DOTA2: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    PUBG: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40",
  };
  return (
    <span
      className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors[code] || "bg-zinc-700"}`}
    >
      {code}
    </span>
  );
}

export default function Home() {
  return (
    <>
      {/* TICKER */}
      <div className="bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-rose-600/30 border-b border-violet-500/20">
        <div className="mx-auto max-w-7xl px-6 py-1.5 flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-rose-300 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            LIVE
          </span>
          <span className="text-zinc-300 truncate">
            Tulpar 12:7 Saryarqa · Mirage · QCL Полуфинал
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400 truncate hidden sm:inline">
            Aqsunqar 1:0 Berkut · DPC KZ
          </span>
          <span className="ml-auto text-violet-300">
            <Link href="/matches" className="hover:text-violet-200">
              Все матчи →
            </Link>
          </span>
        </div>
      </div>

      <header className="border-b border-violet-500/10 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-sm clip-corner group-hover:scale-110 transition-transform">
              E
            </div>
            <span className="font-black text-lg tracking-tight">
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                ESPORTS
              </span>
              <span className="text-zinc-500 font-mono">.kz</span>
            </span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-zinc-400 hover:text-violet-300 transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-violet-400 group-hover:w-full transition-all" />
              </Link>
            ))}
          </nav>
          <UserMenu />
        </div>
      </header>

      <main className="flex-1">
        {/* COMPACT HERO */}
        <section className="relative overflow-hidden border-b border-zinc-800/60">
          <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono uppercase tracking-wider mb-4">
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  Сезон Spring 2026
                </div>
                <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-[0.95]">
                  <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent text-glow">
                    Киберспорт Казахстана
                  </span>
                  <span className="block text-zinc-300">в одном месте.</span>
                </h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/tournaments"
                  className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all glow-violet clip-corner"
                >
                  Турниры
                </Link>
                <Link
                  href="/players"
                  className="inline-flex items-center justify-center h-11 px-6 rounded font-bold text-sm uppercase tracking-wider border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5 transition-all clip-corner"
                >
                  Найти тиммейта
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* HLTV-STYLE 3-COLUMN GRID */}
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
            {/* LEFT — MATCHES */}
            <aside className="space-y-6 lg:sticky lg:top-20 self-start">
              {/* Live */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-rose-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                    Live · {liveMatches.length}
                  </h3>
                  <Link
                    href="/matches"
                    className="text-xs text-zinc-500 hover:text-violet-300 font-mono"
                  >
                    ALL →
                  </Link>
                </div>
                <div className="space-y-2">
                  {liveMatches.map((m, i) => (
                    <div
                      key={i}
                      className="rounded border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors p-3"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2">
                        <GameTag code={m.game} />
                        <span className="truncate ml-2">{m.stage}</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold truncate">{m.teamA.name}</span>
                          <span
                            className={`font-mono font-bold ${m.teamA.score > m.teamB.score ? "text-rose-300" : "text-zinc-400"}`}
                          >
                            {m.teamA.score}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold truncate">{m.teamB.name}</span>
                          <span
                            className={`font-mono font-bold ${m.teamB.score > m.teamA.score ? "text-rose-300" : "text-zinc-400"}`}
                          >
                            {m.teamB.score}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] font-mono text-zinc-500">
                        {m.map}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-violet-400">
                    Расписание
                  </h3>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-900/40 overflow-hidden divide-y divide-zinc-800">
                  {upcomingMatches.map((m, i) => (
                    <div
                      key={i}
                      className="p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                        <GameTag code={m.game} />
                        <span>{m.time}</span>
                      </div>
                      <div className="text-sm font-medium leading-tight">
                        {m.teamA}{" "}
                        <span className="text-zinc-600 font-mono text-xs mx-1">
                          vs
                        </span>{" "}
                        {m.teamB}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                        {m.stage}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-3">
                  Результаты
                </h3>
                <div className="rounded border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
                  {recentResults.map((r, i) => (
                    <div key={i} className="p-3 hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1.5">
                        <GameTag code={r.game} />
                        <span>{r.when}</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`truncate ${r.teamA.won ? "font-bold text-zinc-100" : "text-zinc-500"}`}
                          >
                            {r.teamA.name}
                          </span>
                          <span
                            className={`font-mono ${r.teamA.won ? "text-emerald-400 font-bold" : "text-zinc-500"}`}
                          >
                            {r.teamA.score}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`truncate ${r.teamB.won ? "font-bold text-zinc-100" : "text-zinc-500"}`}
                          >
                            {r.teamB.name}
                          </span>
                          <span
                            className={`font-mono ${r.teamB.won ? "text-emerald-400 font-bold" : "text-zinc-500"}`}
                          >
                            {r.teamB.score}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-1">
                        {r.map}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* CENTER — NEWS FEED */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black tracking-tight">
                  <span className="text-violet-400 font-mono text-xs uppercase tracking-widest mr-2">
                    //
                  </span>
                  Лента новостей
                </h2>
                <div className="flex gap-2 text-xs font-mono text-zinc-500">
                  <button className="px-2 py-1 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                    ВСЕ
                  </button>
                  <button className="px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700">
                    CS2
                  </button>
                  <button className="px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700">
                    DOTA2
                  </button>
                  <button className="px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700">
                    PUBG
                  </button>
                </div>
              </div>

              {/* Featured news (first item, big) */}
              <article
                className={`group relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 transition-colors mb-4 cursor-pointer`}
              >
                <div className="aspect-[16/7] bg-gradient-to-br from-violet-600/30 via-fuchsia-600/20 to-zinc-900 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(167,139,250,0.3),transparent_60%)]" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-1 rounded border ${newsFeed[0].badgeColor}`}
                    >
                      {newsFeed[0].tag}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-black tracking-tight group-hover:text-violet-200 transition-colors">
                      {newsFeed[0].title}
                    </h3>
                    <p className="text-sm text-zinc-300 mt-2 line-clamp-2">
                      {newsFeed[0].excerpt}
                    </p>
                    <div className="text-xs font-mono text-zinc-400 mt-3">
                      {newsFeed[0].time}
                    </div>
                  </div>
                </div>
              </article>

              {/* Smaller news cards */}
              <div className="space-y-3">
                {newsFeed.slice(1).map((n, i) => (
                  <article
                    key={i}
                    className={`group flex gap-4 rounded-lg border border-zinc-800 ${n.accent} border-l-4 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors p-4 cursor-pointer`}
                  >
                    <div className="w-24 sm:w-32 aspect-square shrink-0 rounded bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center font-black text-2xl text-zinc-700">
                      {n.tag.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${n.badgeColor}`}
                        >
                          {n.tag}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {n.time}
                        </span>
                      </div>
                      <h3 className="font-bold leading-tight group-hover:text-violet-200 transition-colors">
                        {n.title}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                        {n.excerpt}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Link
                  href="/news"
                  className="inline-flex items-center gap-2 text-sm font-mono text-violet-300 hover:text-violet-200"
                >
                  ▼ Загрузить ещё
                </Link>
              </div>
            </div>

            {/* RIGHT — RANKINGS */}
            <aside className="space-y-6 lg:sticky lg:top-20 self-start">
              {/* Featured tournament */}
              <div className="relative rounded-lg overflow-hidden border border-violet-500/30 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent p-5 scan-line">
                <div className="font-mono text-[10px] uppercase tracking-widest text-violet-300 mb-2">
                  ★ Featured Tournament
                </div>
                <div className="font-black text-lg leading-tight mb-1">
                  {featuredTournament.name}
                </div>
                <GameTag code={featuredTournament.game} />
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-mono text-zinc-500 uppercase">Призовой</div>
                    <div className="font-bold text-amber-300">
                      {featuredTournament.prize}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-zinc-500 uppercase">Команды</div>
                    <div className="font-bold">{featuredTournament.teams}</div>
                  </div>
                  <div>
                    <div className="font-mono text-zinc-500 uppercase">Статус</div>
                    <div className="font-bold text-emerald-300">
                      {featuredTournament.status}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-zinc-500 uppercase">До старта</div>
                    <div className="font-bold">{featuredTournament.daysLeft} дн</div>
                  </div>
                </div>
                <Link
                  href="/tournaments/spring-open-2026"
                  className="mt-4 block w-full text-center h-9 leading-9 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all"
                >
                  Зарегистрировать команду
                </Link>
              </div>

              {/* Top teams */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-amber-400">
                    🏆 Top Teams
                  </h3>
                  <Link
                    href="/teams"
                    className="text-xs text-zinc-500 hover:text-violet-300 font-mono"
                  >
                    ALL →
                  </Link>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
                  {topTeams.map((t) => (
                    <div
                      key={t.rank}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <span
                        className={`font-mono font-black text-sm w-5 ${t.rank === 1 ? "text-amber-300" : t.rank === 2 ? "text-zinc-300" : t.rank === 3 ? "text-amber-700" : "text-zinc-500"}`}
                      >
                        {t.rank}
                      </span>
                      <div className="w-7 h-7 rounded bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 flex items-center justify-center text-xs font-bold">
                        {t.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{t.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {t.points} pts
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold ${t.change.startsWith("+") ? "text-emerald-400" : t.change.startsWith("-") ? "text-rose-400" : "text-zinc-500"}`}
                      >
                        {t.change}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top players */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-violet-400">
                    ⚡ Top Players
                  </h3>
                  <Link
                    href="/players"
                    className="text-xs text-zinc-500 hover:text-violet-300 font-mono"
                  >
                    ALL →
                  </Link>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-900/40 divide-y divide-zinc-800">
                  {topPlayers.map((p) => (
                    <div
                      key={p.rank}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <span className="font-mono font-black text-sm w-5 text-zinc-500">
                        {p.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{p.nick}</div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {p.team} · {p.role}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-violet-300">
                        {p.rating}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sponsor slot */}
              <div className="rounded border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
                  Реклама
                </div>
                <div className="text-sm text-zinc-400 mb-3">
                  Здесь может быть ваш бренд
                </div>
                <Link
                  href="/sponsors"
                  className="inline-block text-xs font-mono text-violet-300 hover:text-violet-200 underline"
                >
                  СТАТЬ СПОНСОРОМ →
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* GAMES */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
                // 01 · Disciplines
              </p>
              <h2 className="text-3xl font-black tracking-tight">Дисциплины</h2>
            </div>
            <Link
              href="/tournaments"
              className="text-sm text-zinc-400 hover:text-violet-300 font-medium hidden sm:inline"
            >
              Все турниры →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {games.map((game) => (
              <Link
                href={`/tournaments?game=${game.code.toLowerCase()}`}
                key={game.code}
                className={`group relative rounded-lg bg-zinc-900/60 border border-zinc-800 ${game.border} ${game.glow} p-6 transition-all hover:-translate-y-1 overflow-hidden`}
              >
                <div
                  className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${game.accent}`}
                />
                <div className="font-mono text-xs text-zinc-500 mb-1">
                  /game/{game.code.toLowerCase()}
                </div>
                <div
                  className={`text-2xl font-black bg-gradient-to-r ${game.accent} bg-clip-text text-transparent`}
                >
                  {game.code}
                </div>
                <h3 className="text-xl font-bold mt-1">{game.name}</h3>
                <p className="text-zinc-500 text-sm mt-3 font-mono">
                  {game.format}
                </p>
                <div className="mt-6 flex items-center text-sm text-zinc-400 group-hover:text-violet-300 transition-colors">
                  Расписание матчей{" "}
                  <span className="ml-1 group-hover:translate-x-1 transition-transform">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* SPONSORS */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-zinc-800/60">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-fuchsia-400 font-mono text-xs uppercase tracking-widest mb-2">
                // 02 · Partners
              </p>
              <h2 className="text-3xl font-black tracking-tight">
                Поддержка киберспорта Казахстана
              </h2>
              <p className="text-zinc-400 mt-3 max-w-2xl">
                Бренды, которые помогают развивать локальную сцену. Стань частью
                экосистемы — выбери ежемесячный пакет спонсорства.
              </p>
            </div>
          </div>

          <div className="mb-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-4">
              Наши партнёры
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/1] rounded border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 text-xs font-mono hover:border-violet-500/40 transition-colors"
                >
                  SLOT {i + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sponsorTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-lg border ${tier.border} bg-zinc-900/60 p-6 hover:bg-zinc-900/80 transition-all ${
                  tier.featured ? "lg:-translate-y-2 ring-1 ring-amber-400/30" : ""
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-bold uppercase tracking-wider">
                    Популярный
                  </div>
                )}
                <div
                  className={`text-2xl font-black bg-gradient-to-r ${tier.accent} bg-clip-text text-transparent`}
                >
                  {tier.name}
                </div>
                <div className="text-zinc-500 text-sm font-mono mt-1">
                  {tier.kz}
                </div>
                <div className="mt-4 pb-4 border-b border-zinc-800">
                  <div className="text-xl font-bold">{tier.price}</div>
                  <div className="text-xs text-zinc-500 font-mono">в месяц</div>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <span className="text-violet-400 mt-1">▸</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-lg border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-rose-500/10 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-violet-300 mb-2">
                Для брендов и инвесторов
              </p>
              <h3 className="text-2xl font-black tracking-tight">
                Ваш бренд + наша аудитория = рост киберспорта в КЗ
              </h3>
              <p className="text-zinc-400 mt-2 text-sm">
                Прямой доступ к 16-35 геймерам Казахстана. Прозрачная отчётность,
                индивидуальные активации, ко-брендинг турниров.
              </p>
            </div>
            <Link
              href="/sponsors"
              className="shrink-0 inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all clip-corner"
            >
              Стать спонсором →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-violet-500/10 mt-auto bg-zinc-950/80">
        <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-zinc-500 flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-black text-xs">
              E
            </div>
            <span className="font-mono">© 2026 ESPORTS.KZ</span>
          </div>
          <span className="font-mono text-xs uppercase tracking-wider">
            Built for the Kazakh esports community
          </span>
        </div>
      </footer>
    </>
  );
}
