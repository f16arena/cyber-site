"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export type PlayerActionResult =
  | { ok: true }
  | { ok: false; error: string };

const DURATION_MS: Record<string, number | null> = {
  "1d": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  perm: null, // навсегда — кладём дату в +100 лет
};

export async function adminBanHubPlayer(
  formData: FormData
): Promise<PlayerActionResult> {
  const admin = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const duration = String(formData.get("duration") ?? "1d");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!userId) return { ok: false, error: "userId_required" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!user) return { ok: false, error: "user_not_found" };

  const ms = DURATION_MS[duration];
  if (ms === undefined) return { ok: false, error: "invalid_duration" };

  const until =
    ms === null
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + ms);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hubBannedUntil: until,
      hubBanReason: reason,
    },
  });

  await prisma.hubQueueTicket.deleteMany({ where: { userId: user.id } });

  await prisma.hubAuditEvent.create({
    data: {
      userId: user.id,
      kind: "ADMIN_BAN",
      payload: { until: until.toISOString(), reason, by: admin.id } as object,
    },
  });
  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_PLAYER_BAN",
      entity: "user",
      entityId: user.id,
      metadata: { username: user.username, until: until.toISOString(), reason } as object,
    },
  });

  revalidatePath("/admin/hub/players");
  return { ok: true };
}

export async function adminUnbanHubPlayer(
  userId: string
): Promise<PlayerActionResult> {
  const admin = await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!user) return { ok: false, error: "user_not_found" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hubBannedUntil: null,
      hubBanReason: null,
      hubCooldownUntil: null,
    },
  });
  await prisma.hubAuditEvent.create({
    data: {
      userId: user.id,
      kind: "ADMIN_UNBAN",
      payload: { by: admin.id } as object,
    },
  });
  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_PLAYER_UNBAN",
      entity: "user",
      entityId: user.id,
      metadata: { username: user.username } as object,
    },
  });

  revalidatePath("/admin/hub/players");
  return { ok: true };
}
