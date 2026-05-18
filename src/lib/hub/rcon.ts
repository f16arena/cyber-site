import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/hub/crypto";
import type { MatchZyConfig } from "@/lib/hub/matchzy-config";
import { log } from "@/lib/hub/log";

/**
 * RCON-клиент для CS2 dedicated server.
 *
 * На этапе 5 — это STUB: только логирование + audit. Реальный TCP-клиент
 * (Source RCON protocol) подключим на этапе 6 за фича-флагом HUB_RCON_LIVE.
 *
 * Контракт: при переходе на боевой клиент API не меняется.
 */

export type RconServer = {
  id: string;
  name: string;
  ip: string;
  port: number;
  /** Уже расшифрованный пароль. */
  rconPassword: string;
};

export type LoadMatchInput = {
  server: RconServer;
  config: MatchZyConfig;
  matchId: string;
};

export async function loadMatch(input: LoadMatchInput): Promise<{ ok: true }> {
  const live = process.env.HUB_RCON_LIVE === "true";

  if (!live) {
    log.info(
      "rcon:stub",
      `would send matchzy_loadmatch to ${input.server.ip}:${input.server.port} for match ${input.matchId}`
    );
    await prisma.hubAuditEvent.create({
      data: {
        kind: "RCON_STUB",
        payload: {
          matchId: input.matchId,
          serverId: input.server.id,
          ip: input.server.ip,
          port: input.server.port,
          configMatchId: input.config.matchid,
        },
      },
    });
    return { ok: true };
  }

  // На этапе 6 здесь будет:
  //   const client = await SourceRcon.connect(input.server.ip, input.server.port);
  //   await client.auth(input.server.rconPassword);
  //   await client.exec(`matchzy_loadmatch_url ${signedConfigUrl(input.matchId)}`);
  //   client.close();
  throw new Error("HUB_RCON_LIVE=true but live client not implemented yet (этап 6)");
}

/** Удобная обёртка: вытащить сервер по id и расшифровать пароль. */
export async function loadRconServerById(
  serverId: string
): Promise<RconServer | null> {
  const s = await prisma.hubServer.findUnique({
    where: { id: serverId },
    select: { id: true, name: true, ip: true, port: true, rconPassword: true },
  });
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    ip: s.ip,
    port: s.port,
    rconPassword: decryptSecret(s.rconPassword),
  };
}
