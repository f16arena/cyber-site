import type { Metadata } from "next";
import { Geist, Unbounded, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

const unbounded = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
});

const SITE_URL =
  process.env.SITE_URL || "https://cyber-site-five.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Esports.kz — киберспорт Казахстана",
    template: "%s · Esports.kz",
  },
  description:
    "Сообщество киберспортсменов Казахстана. Турниры по CS2, Dota 2, PUBG. Поиск тиммейтов, команды, лидерборды, мировые новости.",
  keywords: [
    "киберспорт",
    "esports kazakhstan",
    "CS2",
    "Dota 2",
    "PUBG",
    "турниры",
    "команды",
    "Казахстан",
    "QCL",
    "FACEIT",
  ],
  authors: [{ name: "Esports.kz" }],
  openGraph: {
    type: "website",
    siteName: "Esports.kz",
    title: "Esports.kz — киберспорт Казахстана",
    description:
      "Турниры, команды, тиммейты, лидерборды и мировая киберспорт-сцена в одном месте.",
    locale: "ru_RU",
    alternateLocale: ["kk_KZ", "en_US"],
    url: SITE_URL,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Esports.kz — киберспорт Казахстана",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Esports.kz — киберспорт Казахстана",
    description:
      "Турниры по CS2, Dota 2, PUBG. Поиск тиммейтов и команд в КЗ.",
    images: ["/og-default.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geist.variable} ${unbounded.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
