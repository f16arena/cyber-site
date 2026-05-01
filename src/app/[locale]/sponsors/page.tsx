import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { InquiryForm } from "./inquiry-form";

export const metadata: Metadata = {
  title: "Спонсорам — Esports.kz",
  description:
    "Хочешь быть в ногу с молодёжью? Прорекламировать свой продукт казахстанским геймерам? Свяжись с нами для программы спонсорства.",
};

const audienceFacts = [
  { value: "16–35", label: "Возраст" },
  { value: "85%", label: "Мужчины" },
  { value: "20+ ч/нед", label: "Время в играх" },
  { value: "Алматы", label: "Топ-1 город" },
];

const benefits = [
  {
    icon: "🎯",
    title: "Точное попадание",
    text: "16-35 лет — самая ценная аудитория для гейминг-периферии, телекомов, банков, энергетиков, FMCG.",
  },
  {
    icon: "📺",
    title: "Лояльные зрители",
    text: "Игроки смотрят турниры на стримах от начала до конца. Это не TikTok-просмотр на 3 секунды.",
  },
  {
    icon: "💎",
    title: "Эмоциональная связь",
    text: "Бренд, поддерживающий любимый турнир — это бренд «свой», не просто реклама в баннере.",
  },
  {
    icon: "📊",
    title: "Прозрачная аналитика",
    text: "Реальные показы, клики, охваты стримов. Без накруток. Полный отчёт каждый месяц.",
  },
];

export default function SponsorsPage() {
  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* HERO — обращение к бренду */}
        <section className="relative overflow-hidden border-b border-zinc-800/60">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Партнёрская программа
            </div>
            <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight leading-[1.05] max-w-3xl">
              <span className="block text-zinc-300">Твой бренд</span>
              <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
                в киберспорте Казахстана.
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed">
              Хочешь быть в ногу с молодёжью? Прорекламировать свой продукт
              там, где её внимание не делится между десятком вкладок?
              Получить лояльных клиентов, а не разовые показы?
            </p>
            <p className="mt-4 text-base text-zinc-300 max-w-2xl">
              <strong className="text-violet-300">Esports.kz</strong> — это
              место, где казахстанские геймеры проводят часы каждый день.
              Турниры, команды, рейтинги, чаты. Здесь твой бренд видят те,
              кто готов запоминать и тратить.
            </p>
            <div className="mt-10">
              <a
                href="#contact"
                className="inline-flex items-center justify-center h-14 px-10 rounded font-bold text-base uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 transition-all glow-violet clip-corner"
              >
                Связаться с нами →
              </a>
            </div>
          </div>
        </section>

        {/* AUDIENCE STATS */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <p className="text-violet-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Кого вы получаете
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-6">
            Наша аудитория
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-violet-500/10 rounded-lg overflow-hidden border border-violet-500/20">
            {audienceFacts.map((fact, i) => (
              <div
                key={i}
                className="bg-zinc-950/80 backdrop-blur p-6 sm:p-8 text-center"
              >
                <div className="text-2xl sm:text-3xl font-display font-extrabold bg-gradient-to-b from-violet-300 to-violet-500 bg-clip-text text-transparent leading-tight">
                  {fact.value}
                </div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mt-3 font-mono">
                  {fact.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WHY */}
        <section className="mx-auto max-w-7xl px-6 py-16 border-t border-zinc-800/60">
          <p className="text-fuchsia-400 font-mono text-xs uppercase tracking-widest mb-2">
            // Почему это работает
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-6">
            Что вы получаете от партнёрства
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-violet-500/30 transition-colors"
              >
                <div className="text-4xl mb-3">{b.icon}</div>
                <h3 className="font-display font-bold text-lg mb-2">
                  {b.title}
                </h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="mx-auto max-w-3xl px-6 py-20 scroll-mt-20"
        >
          <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-rose-500/10 p-8 sm:p-12">
            <p className="font-mono text-xs uppercase tracking-widest text-violet-300 mb-3">
              // Связаться
            </p>
            <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight mb-3 leading-tight">
              Расскажи о&nbsp;своём бренде
            </h2>
            <p className="text-zinc-400 mb-6 text-base">
              Заполни форму — наша команда свяжется с тобой в течение 24 часов
              с персональным предложением. Без шаблонов.
            </p>
            <InquiryForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
