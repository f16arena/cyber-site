// @ts-expect-error — пакет rcon-srcds без типов на 0.x
import RconSrcds from "rcon-srcds";
import type { ServerConfig } from "./config.js";

/**
 * Простой RCON-клиент для CS2 (Source RCON protocol).
 * Открывает соединение, шлёт команду, закрывает.
 */
export async function rconExec(
  server: ServerConfig,
  command: string
): Promise<string> {
  const client = new RconSrcds({
    host: server.ip,
    port: server.port,
    encoding: "utf8",
    timeout: 5000,
  });

  try {
    await client.authenticate(server.rconPassword);
    const response = await client.execute(command);
    return typeof response === "string" ? response : String(response ?? "");
  } finally {
    try {
      client.disconnect();
    } catch {
      // ignore
    }
  }
}
