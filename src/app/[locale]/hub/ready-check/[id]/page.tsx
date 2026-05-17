export const dynamic = "force-dynamic";

import { redirect, notFound } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { getReadyCheckSnapshot } from "@/lib/hub/ready-check";
import { ReadyScreen } from "./ready-screen";

export default async function HubReadyCheckPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getOptionalHubUser();
  if (!user) redirect("/api/auth/steam");

  const snap = await getReadyCheckSnapshot(id);
  if (!snap) notFound();

  const isParticipant = snap.participants.some((p) => p.userId === user.id);
  if (!isParticipant) {
    redirect(`/${locale}/hub`);
  }

  return <ReadyScreen locale={locale} readyCheckId={id} meUserId={user.id} />;
}
