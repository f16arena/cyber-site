import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Esports.kz — киберспорт Казахстана";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #07070a 0%, #1e1b4b 50%, #4c1d95 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          position: "relative",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 24,
            }}
          >
            E
          </div>
          <div style={{ display: "flex", fontWeight: 900, fontSize: 28 }}>
            <span
              style={{
                background: "linear-gradient(90deg, #c4b5fd, #f5d0fe)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              ESPORTS
            </span>
            <span style={{ color: "#71717a" }}>.kz</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: "#c4b5fd",
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            Сообщество киберспорта · Казахстан
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1,
              background:
                "linear-gradient(90deg, #c4b5fd 0%, #f5d0fe 50%, #fda4af 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            ИГРАЙ. ПОБЕЖДАЙ.
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 900,
              letterSpacing: -3,
              lineHeight: 1,
              color: "#71717a",
              marginTop: 8,
            }}
          >
            ДОМИНИРУЙ.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#a1a1aa",
            fontSize: 22,
            fontFamily: "monospace",
          }}
        >
          <span>CS2 · Dota 2 · PUBG</span>
          <span>esports.kz</span>
        </div>
      </div>
    ),
    size
  );
}
