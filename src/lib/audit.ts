import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "DELETE_TEAM"
  | "DELETE_SPONSOR"
  | "DELETE_NEWS"
  | "DELETE_WORLD_NEWS"
  | "DELETE_TOURNAMENT"
  | "EDIT_TEAM"
  | "EDIT_SPONSOR"
  | "EDIT_TOURNAMENT"
  | "GRANT_ADMIN"
  | "REVOKE_ADMIN"
  | "CREATE_TOURNAMENT"
  | "GENERATE_BRACKET"
  | "SET_MATCH_RESULT"
  | "AWARD_MVP"
  | "MARK_INQUIRY_HANDLED"
  | "OTHER";

export async function logAdminAction(params: {
  adminId: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.adminActionLog
    .create({
      data: {
        adminId: params.adminId,
        action: params.action,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        metadata: params.metadata ?? undefined,
      },
    })
    .catch(() => {
      // Audit log не должен ломать основной flow
    });
}
