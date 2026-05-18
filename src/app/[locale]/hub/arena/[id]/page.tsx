export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { isHubMapId } from "@/lib/hub/maps";
import { ArenaScreen, type ArenaSettings } from "./arena-screen";

const DEFAULT_POOL = [
  "mirage",
  "inferno",
  "nuke",
  "ancient",
  "anubis",
  "vertigo",
  "dust2",
];

function parseMode(v: string | undefined): ArenaSettings["mode"] {
  if (v === "SOLO" || v === "DUO" || v === "FIVE") return v;
  return "FIVE";
}

function parseFormat(v: string | undefined): ArenaSettings["format"] {
  if (v === "BO1" || v === "BO3" || v === "BO5") return v;
  return "BO1";
}

function parsePrivacy(v: string | undefined): ArenaSettings["privacy"] {
  if (v === "OPEN" || v === "INVITE") return v;
  return "OPEN";
}

export default async function HubArenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{
    name?: string;
    mode?: string;
    format?: string;
    privacy?: string;
    pool?: string;
    host?: string;
  }>;
}) {
  const { locale, id } = await params;
  const sp = await searchParams;

  const user = await getOptionalHubUser();
  if (!user) redirect("/login");

  const pool = (sp.pool ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && isHubMapId(s));

  const settings: ArenaSettings = {
    id,
    name: sp.name?.trim() || "Custom Match",
    mode: parseMode(sp.mode),
    format: parseFormat(sp.format),
    privacy: parsePrivacy(sp.privacy),
    pool: pool.length >= 7 ? pool : DEFAULT_POOL,
    host: sp.host ?? "me",
  };

  return (
    <ArenaScreen locale={locale} settings={settings} meName={user.username} />
  );
}
