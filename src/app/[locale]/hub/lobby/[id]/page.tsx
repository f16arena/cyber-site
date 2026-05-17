export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { getLobbySnapshot } from "@/lib/hub/lobby";
import { LobbyScreen } from "./lobby-screen";

export default async function HubLobbyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getOptionalHubUser();
  if (!user) redirect("/api/auth/steam");

  const snap = await getLobbySnapshot(id);
  if (!snap) notFound();

  const isParticipant =
    snap.captainA.userId === user.id ||
    snap.captainB.userId === user.id ||
    snap.teamA.some((p) => p.userId === user.id) ||
    snap.teamB.some((p) => p.userId === user.id) ||
    snap.available.some((p) => p.userId === user.id);

  if (!isParticipant) {
    redirect(`/${locale}/hub`);
  }

  return <LobbyScreen locale={locale} lobbyId={id} meUserId={user.id} />;
}
