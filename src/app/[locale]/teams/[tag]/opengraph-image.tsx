import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Команда — Esports.kz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({
  params,
}: {
  params: { tag: string };
}) {
  let tag: string;
  try {
    tag = decodeURIComponent(params.tag).toUpperCase();
  } catch {
    tag = params.tag.toUpperCase();
  }
  const team = await prisma.team.findUnique({
    where: { tag },
    select: { name: true, game: true, rating: true, region: true },
  });

  const name = team?.name ?? "Команда";
  const game = team?.game ?? "CS2";
  const rating = team?.rating ?? 1000;
  const region = team?.region ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #07070a 0%, #2a1065 100%)",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          color: "white",
          fontFamily: "system-ui",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 16,
              background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(217,70,239,0.4))",
              border: "2px solid rgba(139,92,246,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 120,
              color: "white",
            }}
          >
            {name[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                color: "#c4b5fd",
                fontSize: 24,
                letterSpacing: 4,
                textTransform: "uppercase",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              [{tag}] · {game}
            </div>
            <div
              style={{
                fontSize: 80,
                fontWeight: 900,
                letterSpacing: -3,
                lineHeight: 1,
                marginTop: 12,
                background:
                  "linear-gradient(90deg, #c4b5fd 0%, #f5d0fe 100%)",
                backgroundClip: "text",
                color: "transparent",
                display: "flex",
                maxWidth: 800,
              }}
            >
              {name.length > 24 ? name.slice(0, 22) + "…" : name}
            </div>
            <div
              style={{
                display: "flex",
                gap: 24,
                marginTop: 18,
                color: "#a1a1aa",
                fontSize: 24,
                fontFamily: "monospace",
              }}
            >
              <span>🏆 {rating} pts</span>
              {region && <span>· 📍 {region}</span>}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 80,
            right: 80,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#a1a1aa",
            fontSize: 22,
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 20,
              }}
            >
              E
            </div>
            <span style={{ fontWeight: 700, color: "#e4e4e7", fontSize: 24 }}>
              ESPORTS.KZ
            </span>
          </div>
          <span>команды Казахстана</span>
        </div>
      </div>
    ),
    size
  );
}
