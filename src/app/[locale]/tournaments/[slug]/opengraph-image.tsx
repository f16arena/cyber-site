import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Турнир — Esports.kz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({
  params,
}: {
  params: { slug: string };
}) {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    select: { name: true, prize: true, game: true, maxTeams: true },
  });

  const title = t?.name ?? "Турнир Esports.kz";
  const prize = t ? Number(t.prize) / 100 : 0;
  const game = t?.game ?? "CS2";
  const maxTeams = t?.maxTeams ?? 8;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #07070a 0%, #1e1b4b 60%, #4c1d95 100%)",
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
            gap: 12,
            color: "#c4b5fd",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              background: "rgba(139, 92, 246, 0.2)",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              borderRadius: 6,
              fontSize: 18,
            }}
          >
            {game}
          </div>
          ★ Tournament
        </div>

        <div
          style={{
            fontSize: 92,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            marginTop: 28,
            background:
              "linear-gradient(90deg, #c4b5fd 0%, #f5d0fe 50%, #fda4af 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
            maxWidth: "100%",
          }}
        >
          {title.length > 40 ? title.slice(0, 38) + "…" : title}
        </div>

        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: 40,
            color: "#e4e4e7",
            fontSize: 32,
            fontFamily: "monospace",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 16, color: "#71717a", textTransform: "uppercase", letterSpacing: 2 }}>
              Призовой
            </span>
            <span style={{ fontWeight: 900, color: "#fbbf24", fontSize: 44 }}>
              ₸ {prize.toLocaleString("ru-RU")}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 16, color: "#71717a", textTransform: "uppercase", letterSpacing: 2 }}>
              Команды
            </span>
            <span style={{ fontWeight: 900, fontSize: 44 }}>{maxTeams}</span>
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
          <span>киберспорт Казахстана</span>
        </div>
      </div>
    ),
    size
  );
}
