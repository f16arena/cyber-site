export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchSnapshot } from "@/lib/hub/match";
import { displayNameFor } from "@/lib/hub/maps";
import { SpectateScreen } from "./spectate-screen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const snap = await getMatchSnapshot(id).catch(() => null);
  if (!snap) return { title: "F16 HUB · Spectate" };
  return {
    title: `Spectate · ${displayNameFor(snap.map)} ${snap.scoreA}:${snap.scoreB} · F16 HUB`,
    description: `CS2 матч на ${displayNameFor(snap.map)} — спектейт live`,
  };
}

export default async function HubSpectatePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const snap = await getMatchSnapshot(id);
  if (!snap) notFound();

  return <SpectateScreen matchId={id} />;
}
