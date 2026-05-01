import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Esports.kz — киберспорт Казахстана",
    short_name: "Esports.kz",
    description:
      "Сообщество киберспортсменов Казахстана. Турниры по CS2, Dota 2, PUBG.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07070a",
    theme_color: "#7c3aed",
    lang: "ru",
    categories: ["games", "sports", "social"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
