export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { getMatchSnapshot } from "@/lib/hub/match";
import { MatchScreen } from "./match-screen";

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
  if (!isParticipant) {
    redirect(`/${locale}/hub`);
  }

  return <MatchScreen locale={locale} matchId={id} />;
}
