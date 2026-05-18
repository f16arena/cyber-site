import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { displayNameFor } from "@/lib/hub/maps";

export const runtime = "nodejs";
export const alt = "F16 HUB · CS2 Match";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAP_GRADIENTS: Record<string, [string, string]> = {
  mirage: ["#b45309", "#fde68a"],
  inferno: ["#7c2d12", "#f97316"],
  nuke: ["#0c4a6e", "#38bdf8"],
  ancient: ["#14532d", "#86efac"],
  anubis: ["#92400e", "#facc15"],
  vertigo: ["#1e293b", "#cbd5e1"],
  dust2: ["#9a3412", "#fed7aa"],
};

export default async function MatchOgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let match: {
    id: string;
    map: string;
    state: string;
    scoreA: number;
    scoreB: number;
    winner: string | null;
    teamAPlayerIds: string[];
    teamBPlayerIds: string[];
  } | null = null;
  try {
    match = await prisma.hubMatch.findUnique({
      where: { id },
      select: {
        id: true,
        map: true,
        state: true,
        scoreA: true,
        scoreB: true,
        winner: true,
        teamAPlayerIds: true,
        teamBPlayerIds: true,
      },
    });
  } catch {
    // если БД недоступна / id не существует — отдадим дефолт-картинку
  }

  const mapId = match?.map ?? "mirage";
  const [from, to] = MAP_GRADIENTS[mapId] ?? ["#27272a", "#52525b"];
  const mapName = displayNameFor(mapId);
  const scoreA = match?.scoreA ?? 0;
  const scoreB = match?.scoreB ?? 0;
  const state = match?.state ?? "WARMUP";
  const winner = match?.winner;
  const teamASize = match?.teamAPlayerIds.length ?? 5;
  const teamBSize = match?.teamBPlayerIds.length ?? 5;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
          position: "relative",
        }}
      >
        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.5) 100%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 60,
            width: "100%",
            height: "100%",
            color: "white",
          }}
        >
          {/* Top: brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, #f97316 0%, #e11d48 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 28,
              }}
            >
              F
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  letterSpacing: -1,
                  color: "#fb923c",
                }}
              >
                F16 HUB
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  color: "rgba(255,255,255,0.7)",
                  textTransform: "uppercase",
                }}
              >
                CS2 Matchmaking
              </div>
            </div>
          </div>

          {/* Middle: map + score */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 96,
                fontWeight: 900,
                letterSpacing: -3,
                textShadow: "0 4px 24px rgba(0,0,0,0.5)",
              }}
            >
              {mapName}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                fontSize: 120,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              <span style={{ color: "#fb923c" }}>{scoreA}</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>:</span>
              <span style={{ color: "#fb7185" }}>{scoreB}</span>
            </div>
          </div>

          {/* Bottom: teams + status */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                Team A · {teamASize}
                {" vs "}
                {teamBSize} · Team B
              </div>
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: 8,
                border: "2px solid rgba(255,255,255,0.4)",
                background: "rgba(0,0,0,0.4)",
                fontSize: 22,
                fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: 2,
                color:
                  state === "LIVE"
                    ? "#fb7185"
                    : state === "FINISHED"
                    ? "#34d399"
                    : "rgba(255,255,255,0.9)",
              }}
            >
              {state === "FINISHED" && winner
                ? `WINNER · TEAM ${winner}`
                : state}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
