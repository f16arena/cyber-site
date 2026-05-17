export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getOptionalHubUser } from "@/lib/hub/auth";
import { getQueueSnapshot } from "@/lib/hub/queue";
import { QueueScreen } from "./queue-screen";

export default async function HubQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getOptionalHubUser();
  if (!user) redirect("/api/auth/steam");

  const snap = await getQueueSnapshot(user.id);

  // Если по факту не в очереди — на дашборд
  if (!snap.ticket) redirect(`/${locale}/hub`);
  // Если уже в ready-check — туда
  if (snap.ticket.status === "READY_CHECK" && snap.ticket.readyCheckId) {
    redirect(`/${locale}/hub/ready-check/${snap.ticket.readyCheckId}`);
  }
  if (snap.lobbyId) redirect(`/${locale}/hub/lobby/${snap.lobbyId}`);

  return <QueueScreen locale={locale} />;
}
