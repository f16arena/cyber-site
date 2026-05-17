"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export type QueueActionResult = { ok: true } | { ok: false; error: string };

export async function adminRemoveFromQueue(
  ticketId: string
): Promise<QueueActionResult> {
  const admin = await requireAdmin();

  const ticket = await prisma.hubQueueTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, status: true },
  });
  if (!ticket) return { ok: false, error: "not_found" };
  if (ticket.status === "READY_CHECK") {
    return { ok: false, error: "in_ready_check" };
  }

  await prisma.hubQueueTicket.delete({ where: { id: ticket.id } });

  await prisma.hubAuditEvent.create({
    data: {
      userId: ticket.userId,
      kind: "ADMIN_KICK_QUEUE",
      payload: { by: admin.id } as object,
    },
  });
  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_QUEUE_KICK",
      entity: "hub_queue_ticket",
      entityId: ticket.id,
      metadata: { userId: ticket.userId } as object,
    },
  });

  revalidatePath("/admin/hub/queue");
  return { ok: true };
}
