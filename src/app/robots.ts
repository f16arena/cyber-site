import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.SITE_URL || "https://cyber-site-five.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/profile/edit", "/messages"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
