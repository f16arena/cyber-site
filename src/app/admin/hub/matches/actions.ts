"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { finishMatch, cancelMatch } from "@/lib/hub/match-result";

export type AdminMatchResult =
  | { ok: true; deltaA?: number; deltaB?: number }
  | { ok: false; error: string };

export async function adminFinishMatch(
  formData: FormData
): Promise<AdminMatchResult> {
  const admin = await requireAdmin();

  const matchId = String(formData.get("matchId") ?? "");
  const scoreA = Number(formData.get("scoreA"));
  const scoreB = Number(formData.get("scoreB"));
  const winner = String(formData.get("winner") ?? "") as "A" | "B";

  if (!matchId) return { ok: false, error: "matchId_required" };
  if (winner !== "A" && winner !== "B") {
    return { ok: false, error: "winner_required" };
  }

  const res = await finishMatch(matchId, scoreA, scoreB, winner);
  if (!res.ok) return { ok: false, error: res.error };

  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_MATCH_FINISH",
      entity: "hub_match",
      entityId: matchId,
      metadata: { scoreA, scoreB, winner, deltaA: res.deltaA, deltaB: res.deltaB } as object,
    },
  });

  revalidatePath("/admin/hub/matches");
  return { ok: true, deltaA: res.deltaA, deltaB: res.deltaB };
}

export async function adminCancelMatch(matchId: string): Promise<AdminMatchResult> {
  const admin = await requireAdmin();
  const res = await cancelMatch(matchId, "admin_cancel");
  if (!res.ok) return { ok: false, error: res.error };

  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_MATCH_CANCEL",
      entity: "hub_match",
      entityId: matchId,
    },
  });
  revalidatePath("/admin/hub/matches");
  return { ok: true };
}
