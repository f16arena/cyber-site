export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getMatchSnapshot } from "@/lib/hub/match";
import { OverlayClient } from "./overlay-client";

/**
 * Streamer overlay для OBS Browser Source.
 *
 * Использование:
 *   1. В OBS → Sources → + → Browser Source
 *   2. URL: https://your-domain.com/overlay/hub/<matchId>
 *   3. Width: 1920, Height: 1080
 *   4. CSS body { background: transparent; } — уже в page
 *
 * Страница публичная, без аутентификации, прозрачный фон.
 * Auto-update через тот же spectate SSE-стрим.
 */
export default async function OverlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snap = await getMatchSnapshot(id);
  if (!snap) notFound();

  return (
    <>
      <style>{`
        html, body {
          background: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
      <OverlayClient matchId={id} />
    </>
  );
}
