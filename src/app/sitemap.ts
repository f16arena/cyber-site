import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL =
  process.env.SITE_URL || "https://cyber-site-five.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tournaments, teams, news, worldNews] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { not: "DRAFT" } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.team.findMany({
      select: { tag: true, updatedAt: true },
    }),
    prisma.news.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.worldNews.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/tournaments",
    "/matches",
    "/teams",
    "/players",
    "/leaderboard",
    "/news",
    "/world-news",
    "/sponsors",
  ].flatMap((path) =>
    ["", "/kk", "/en"].map((localePrefix) => ({
      url: `${SITE_URL}${localePrefix}${path}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.8,
    }))
  );

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...tournaments.map((t) => ({
      url: `${SITE_URL}/tournaments/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...teams.map((t) => ({
      url: `${SITE_URL}/teams/${t.tag}`,
      lastModified: t.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...news.map((n) => ({
      url: `${SITE_URL}/news/${n.slug}`,
      lastModified: n.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...worldNews.map((n) => ({
      url: `${SITE_URL}/world-news/${n.id}`,
      lastModified: n.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
