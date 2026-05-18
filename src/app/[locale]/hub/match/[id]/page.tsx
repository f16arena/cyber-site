export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { getMatchSnapshot } from "@/lib/hub/match";
import { displayNameFor } from "@/lib/hub/maps";
import { MatchScreen } from "./match-screen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const snap = await getMatchSnapshot(id).catch(() => null);
  if (!snap) {
    return { title: "F16 HUB · Match" };
  }
  const mapName = displayNameFor(snap.map);
  const state =
    snap.state === "FINISHED" && snap.winner
      ? `Winner: Team ${snap.winner}`
      : snap.state;
  return {
    title: `${mapName} · ${snap.scoreA} : ${snap.scoreB} · F16 HUB`,
    description: `CS2 матч на карте ${mapName}. ${state}.`,
    openGraph: {
      title: `${mapName} · ${snap.scoreA} : ${snap.scoreB}`,
      description: `F16 HUB · CS2 Matchmaking`,
    },
  };
}

export default async function HubMatchPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getOptionalHubUser();
  if (!user) redirect("/api/auth/steam");

  const snap = await getMatchSnapshot(id);
  if (!snap) notFound();

  const isParticipant =
    snap.teamA.some((p) => p.steamId === user.steamId) ||
    snap.teamB.some((p) => p.steamId === user.steamId) ||
    user.isAdmin;
  if (!isParticipant && !user.isAdmin) {
    redirect(`/${locale}/hub`);
  }

  return (
    <MatchScreen locale={locale} matchId={id} isAdmin={user.isAdmin} />
  );
}
