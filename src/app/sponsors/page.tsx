import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Спонсорам — Esports.kz",
  description:
    "Ежемесячное спонсорство киберспорта Казахстана. Тиры Бронза/Серебро/Золото/Платина. Доступ к аудитории 16-35 геймеров.",
};

const tiers = [
  {
    name: "БРОНЗА",
    kz: "Жез",
    price: "от 50 000 ₸",
    monthly: true,
    description: "Стартовый пакет для локальных брендов и небольших магазинов.",
    perks: [
      "Лого в подвале сайта",
      "Упоминание в 1 турнире/мес",
      "Пост-благодарность в Telegram-канале",
      "Уникальный промокод для аудитории",
    ],
    accent: "from-amber-700 to-amber-900",
    border: "border-amber-700/40",
    text: "text-amber-300",
  },
  {
    name: "СЕРЕБРО",
    kz: "Күміс",
    price: "от 200 000 ₸",
    monthly: true,
    description:
      "Для среднего бизнеса, gaming-периферии, локальных интернет-провайдеров.",
    perks: [
      "Всё из тира Бронза",
      "Лого на главной странице",
      "Бренд-упоминание в 2 турнирах/мес",
      "Анонс-пост в Instagram и TikTok",
      "1 рекламная вставка на стриме / месяц",
    ],
    accent: "from-zinc-300 to-zinc-500",
    border: "border-zinc-400/40",
    text: "text-zinc-200",
  },
  {
    name: "ЗОЛОТО",
    kz: "Алтын",
    price: "от 500 000 ₸",
    monthly: true,
    description:
      "Для крупных брендов, банков, телекомов, букмекеров (где допустимо).",
    perks: [
      "Всё из тира Серебро",
      "Title-спонсор турнира раз в квартал",
      "Баннер на всех стримах",
      "Кубок имени бренда — вручается победителю",
      "Featured-блок в правой колонке главной",
      "Эксклюзивная активация на закрытии сезона",
    ],
    accent: "from-yellow-300 to-amber-600",
    border: "border-amber-400/50",
    text: "text-amber-200",
    featured: true,
  },
  {
    name: "ПЛАТИНА",
    kz: "Platinum",
    price: "по запросу",
    monthly: false,
    description: "Сезонный эксклюзив. Один партнёр на сезон, индивидуальные условия.",
    perks: [
      "Всё из тира Золото",
      "Эксклюзив на сезон (4-6 мес)",
      "Ко-брендинг турнирной серии",
      "Кастомная активация (мерч, ивенты, контент)",
      "Прямой канал связи с командой проекта",
      "Аналитика показов и кликов",
    ],
    accent: "from-violet-300 to-fuchsia-500",
    border: "border-violet-400/50",
    text: "text-violet-200",
  },
];

const audienceFacts = [
  { value: "16–35", label: "Возраст" },
  { value: "85%", label: "Мужчины" },
  { value: "Алматы\nАстана\nШымкент", label: "Топ-3 города" },
  { value: "20+ ч/нед", label: "Время в играх" },
  { value: "Steam\nDiscord\nTwitch", label: "Платформы" },
];

const faq = [
  {
    q: "Как заключается договор?",
    a: "Публичная оферта + индивидуальное приложение под выбранный тир. Юр. форма с нашей стороны — ИП/ТОО (на этапе оформления).",
  },
  {
    q: "Какие гарантии получает спонсор?",
    a: "Прозрачная отчётность: показы, клики, охват трансляций. Для тиров Серебро+ — ежемесячный отчёт; Платина — доступ к dashboard в реальном времени (v3).",
  },
  {
    q: "Можно ли проводить активации?",
    a: "Да: розыгрыши, мерч, кастомные кубки, гостевые комментаторы, спецвыпуски. Тиры Золото/Платина включают это в пакет.",
  },
  {
    q: "Что с букмекерами и крипто?",
    a: "Рассматриваем индивидуально. Реклама азартных игр и крипто-обменников регулируется в РК — нужна проверка лицензии.",
  },
  {
    q: "Минимальный срок партнёрства?",
    a: "Бронза — 1 месяц. Серебро/Золото — от 3 месяцев. Платина — сезон (4-6 месяцев).",
  },
  {
    q: "Как засчитывается охват, если сезон только начинается?",
    a: "На старте мы даём гарантированный пакет показов вместо реальной аудитории — даже если трафика ещё нет. Это снижает риск для первых партнёров.",
  },
];

const navLinks = [
  { href: "/tournaments", label: "Турниры" },
  { href: "/matches", label: "Матчи" },
  { href: "/teams", label: "Команды" },
  { href: "/players", label: "Игроки" },
  { href: "/news", label: "Новости" },
  { href: "/streams", label: "Стримы" },
];

export default function SponsorsPage() {
  return (
    <>
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
                className="text-zinc-400 hover:text-violet-300 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/login"
            className="text-sm px-4 h-9 inline-flex items-center font-medium rounded border border-violet-500/30 hover:border-violet-400 hover:bg-violet-500/10 transition-all"
          >
            Войти через Steam
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-zinc-800/60">
          <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
            <Link
              href="/"
              className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
            >
              ← Главная
            </Link>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Партнёрская программа · Сезон Spring 2026
            </div>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.95] max-w-4xl">
              <span className="block text-zinc-300">Спонсируйте</span>
              <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent text-glow">
                будущее КЗ-сцены.
              </span>
            </h1>
            <p className="mt-8 text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed">
              Ежемесячное партнёрство с платформой, объединяющей игроков
              Казахстана по CS2, Dota 2 и PUBG. Прямой доступ к лояльной аудитории
              16-35.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href="#tiers"
                className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all glow-violet clip-corner"
              >
                Тарифы и пакеты
              </a>
              <a
                href="#contact"
                className="inline-flex items-center justify-center h-12 px-8 rounded font-bold text-sm uppercase tracking-wider border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5 transition-all clip-corner"
              >
                Связаться
              </a>
            </div>
          </div>
        </section>

        {/* AUDIENCE */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // 01 · Audience
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-8">
            Кого вы получаете
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-violet-500/10 rounded-lg overflow-hidden border border-violet-500/20">
            {audienceFacts.map((fact, i) => (
              <div
                key={i}
                className="bg-zinc-950/80 backdrop-blur p-5 sm:p-6 text-center"
              >
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-b from-violet-300 to-violet-500 bg-clip-text text-transparent whitespace-pre-line leading-tight">
                  {fact.value}
                </div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mt-3 font-mono">
                  {fact.label}
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-500 mt-4 font-mono">
            * данные основаны на анализе казахстанского игрового рынка и метриках
            QCL/Steam
          </p>
        </section>

        {/* WHY US */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-zinc-800/60">
          <p className="text-fuchsia-400 font-mono text-xs uppercase tracking-widest mb-2">
            // 02 · Why us
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-8">
            Почему именно мы
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: "🇰🇿",
                title: "Локальный фокус",
                text: "Только КЗ-сцена. Никакого размытого «глобального» охвата — точное попадание в вашу аудиторию.",
              },
              {
                icon: "📊",
                title: "Прозрачная отчётность",
                text: "Реальные цифры показов, кликов и охвата стримов. Без накруток и приукрашиваний.",
              },
              {
                icon: "🤝",
                title: "Гибкость пакетов",
                text: "Никаких годовых контрактов на старте. Бронза от 1 месяца — попробуйте без риска.",
              },
              {
                icon: "🎮",
                title: "Сообщество, не реклама",
                text: "Ваш бренд встроен в опыт игроков, а не висит баннером сбоку. Активации, мерч, ивенты.",
              },
              {
                icon: "📺",
                title: "Live-эфиры с охватом",
                text: "Каждый турнир — стрим на Twitch. Гарантированные показы во время прайм-тайма.",
              },
              {
                icon: "💎",
                title: "Эксклюзив на сезон",
                text: "Тариф Платина — один партнёр на сезон. Вы — единственный голос в категории.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 hover:border-violet-500/30 transition-colors"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TIERS */}
        <section
          id="tiers"
          className="mx-auto max-w-7xl px-6 py-16 border-t border-zinc-800/60 scroll-mt-20"
        >
          <p className="text-amber-400 font-mono text-xs uppercase tracking-widest mb-2">
            // 03 · Tiers
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-2">
            Тарифы спонсорства
          </h2>
          <p className="text-zinc-400 mb-10 max-w-2xl">
            Все цены — от. Финальная сумма зависит от длительности и объёма
            активаций. Тиры можно комбинировать и кастомизировать.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-lg border ${tier.border} bg-zinc-900/60 p-7 hover:bg-zinc-900/80 transition-all flex flex-col ${
                  tier.featured ? "lg:-translate-y-3 ring-1 ring-amber-400/30 shadow-[0_0_60px_-15px_rgba(251,191,36,0.4)]" : ""
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                    Самый популярный
                  </div>
                )}
                <div
                  className={`text-3xl font-black bg-gradient-to-r ${tier.accent} bg-clip-text text-transparent`}
                >
                  {tier.name}
                </div>
                <div className="text-zinc-500 text-sm font-mono">{tier.kz}</div>
                <p className="text-sm text-zinc-400 mt-4 min-h-[3rem]">
                  {tier.description}
                </p>
                <div className="mt-6 pb-6 border-b border-zinc-800">
                  <div className="text-2xl font-black">{tier.price}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-1">
                    {tier.monthly ? "в месяц" : "сезонный пакет"}
                  </div>
                </div>
                <ul className="mt-6 space-y-2.5 text-sm text-zinc-300 flex-1">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <span className={`${tier.text} mt-0.5 shrink-0`}>▸</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className={`mt-6 block text-center h-11 leading-[44px] rounded font-bold text-xs uppercase tracking-wider transition-all clip-corner ${
                    tier.featured
                      ? "bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 hover:from-amber-300 hover:to-amber-500"
                      : "border border-zinc-700 hover:border-violet-400 hover:bg-violet-500/5"
                  }`}
                >
                  Оставить заявку
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-zinc-800/60">
          <p className="text-rose-400 font-mono text-xs uppercase tracking-widest mb-2">
            // 04 · Process
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-10">
            Как это работает
          </h2>
          <div className="grid sm:grid-cols-4 gap-5">
            {[
              {
                step: "01",
                title: "Заявка",
                text: "Заполняете форму или пишете в Telegram. Мы созваниваемся в течение 24 часов.",
              },
              {
                step: "02",
                title: "Бриф",
                text: "Согласуем тир, активации, сроки и KPI. Вы получаете подробное предложение.",
              },
              {
                step: "03",
                title: "Договор",
                text: "Подписание оферты + индивидуального приложения. Оплата по счёту (юрлицо/ИП).",
              },
              {
                step: "04",
                title: "Запуск",
                text: "Размещаем лого/баннеры/активации. Каждый месяц — отчёт по показам и охвату.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 hover:border-violet-500/30 transition-colors"
              >
                <div className="font-mono text-5xl font-black text-violet-500/20 absolute top-3 right-4">
                  {s.step}
                </div>
                <div className="font-mono text-xs text-violet-400 mb-2 uppercase tracking-wider">
                  Step {s.step}
                </div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-4xl px-6 py-16 border-t border-zinc-800/60">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // 05 · FAQ
          </p>
          <h2 className="text-3xl font-black tracking-tight mb-8">
            Частые вопросы
          </h2>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <details
                key={i}
                className="group rounded-lg border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
              >
                <summary className="cursor-pointer p-5 font-bold flex items-center justify-between gap-4 list-none">
                  <span>{item.q}</span>
                  <span className="text-violet-400 font-mono text-xl group-open:rotate-45 transition-transform shrink-0">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-zinc-400 leading-relaxed text-sm">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="mx-auto max-w-4xl px-6 py-20 scroll-mt-20"
        >
          <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-rose-500/10 p-8 sm:p-12">
            <p className="font-mono text-xs uppercase tracking-widest text-violet-300 mb-3">
              // Связаться
            </p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Поговорим о вашем бренде
            </h2>
            <p className="text-zinc-400 mb-8">
              Оставьте контакты — наша команда свяжется с вами в течение 24 часов
              с персональным предложением.
            </p>
            <form className="grid sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Название компании"
                className="bg-zinc-900/60 border border-zinc-700 rounded h-12 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors"
              />
              <input
                type="text"
                placeholder="Контактное лицо"
                className="bg-zinc-900/60 border border-zinc-700 rounded h-12 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                className="bg-zinc-900/60 border border-zinc-700 rounded h-12 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors"
              />
              <input
                type="tel"
                placeholder="Телефон / Telegram"
                className="bg-zinc-900/60 border border-zinc-700 rounded h-12 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors"
              />
              <select
                className="bg-zinc-900/60 border border-zinc-700 rounded h-12 px-4 text-sm focus:outline-none focus:border-violet-400 transition-colors sm:col-span-2"
                defaultValue=""
              >
                <option value="" disabled>
                  Интересующий тир
                </option>
                <option>Бронза — от 50 000 ₸</option>
                <option>Серебро — от 200 000 ₸</option>
                <option>Золото — от 500 000 ₸</option>
                <option>Платина — по запросу</option>
                <option>Не определились — нужна консультация</option>
              </select>
              <textarea
                placeholder="Расскажите кратко о ваших целях"
                rows={4}
                className="bg-zinc-900/60 border border-zinc-700 rounded p-4 text-sm focus:outline-none focus:border-violet-400 transition-colors sm:col-span-2 resize-none"
              />
              <button
                type="button"
                className="sm:col-span-2 h-12 rounded font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all glow-violet clip-corner"
              >
                Отправить заявку →
              </button>
              <p className="sm:col-span-2 text-xs text-zinc-500 text-center font-mono">
                ⚠ Форма временно не отправляется — настроим email после деплоя.
                Пока пишите на Telegram.
              </p>
            </form>
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
