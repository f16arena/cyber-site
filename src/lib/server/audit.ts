import { prisma } from "@/lib/prisma";

/** Записать RCON-команду в лог для аудита. Никогда не бросает. */
export async function logServerCommand(args: {
  serverId: string;
  matchId?: string | null;
  adminId?: string | null;
  command: string;
  response?: string | null;
  success: boolean;
}): Promise<void> {
  try {
    await prisma.serverCommandLog.create({
      data: {
        serverId: args.serverId,
        matchId: args.matchId ?? null,
        adminId: args.adminId ?? null,
        command: args.command,
        response: args.response?.slice(0, 4000) ?? null,
        success: args.success,
      },
    });
  } catch (e) {
    console.error("[server/audit] log failed:", (e as Error).message);
  }
}
