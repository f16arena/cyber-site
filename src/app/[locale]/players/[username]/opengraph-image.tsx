import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Игрок — Esports.kz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({
  params,
}: {
  params: { username: string };
}) {
  let username: string;
  try {
    username = decodeURIComponent(params.username);
  } catch {
    username = params.username;
  }
  const user = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      username: true,
      bio: true,
      profiles: { select: { game: true } },
    },
  });

  const name = user?.username ?? username;
  const games = user?.profiles.map((p) => p.game).join(" · ") || "CS2 · Dota 2 · PUBG";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #07070a 0%, #4c1d95 100%)",
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
            color: "#a78bfa",
            fontSize: 22,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
            fontFamily: "monospace",
          }}
        >
          // Player Profile
        </div>

        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            marginTop: 20,
            background:
              "linear-gradient(90deg, #c4b5fd 0%, #f5d0fe 50%, #fda4af 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          {name.length > 20 ? name.slice(0, 18) + "…" : name}
        </div>

        <div
          style={{
            color: "#e4e4e7",
            fontSize: 36,
            fontFamily: "monospace",
            marginTop: 24,
            display: "flex",
          }}
        >
          {games}
        </div>

        {user?.bio && (
          <div
            style={{
              color: "#a1a1aa",
              fontSize: 24,
              marginTop: 28,
              maxWidth: 1000,
              display: "flex",
              lineHeight: 1.4,
            }}
          >
            {user.bio.length > 140 ? user.bio.slice(0, 138) + "…" : user.bio}
          </div>
        )}

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
