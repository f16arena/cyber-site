import Fastify from "fastify";
import { config } from "./config.js";
import { hmacVerify, bodyHash, hmacSign } from "./auth.js";
import { rconExec } from "./rcon.js";

const app = Fastify({ logger: true });

/** Проверяет подпись Vercel → srv-control. */
function verifyRequest(
  method: string,
  path: string,
  body: string,
  signature: string | undefined
): boolean {
  if (!signature) return false;
  const payload = `${method}\n${path}\n${bodyHash(body)}`;
  return hmacVerify(payload, signature, config.sharedSecret);
}

app.get("/health", async () => {
  return { ok: true, servers: config.servers.length };
});

/**
 * Vercel шлёт RCON-команды сюда. Подпись в заголовке X-F16-Signature.
 * Body: { command: string }
 */
app.post<{ Params: { id: string }; Body: { command: string } }>(
  "/server/:id/rcon",
  async (request, reply) => {
    const rawBody = JSON.stringify(request.body ?? {});
    const sig = request.headers["x-f16-signature"];
    if (
      !verifyRequest(
        "POST",
        `/server/${request.params.id}/rcon`,
        rawBody,
        typeof sig === "string" ? sig : undefined
      )
    ) {
      return reply.code(401).send({ error: "Invalid signature" });
    }

    const server = config.servers.find((s) => s.id === request.params.id);
    if (!server) {
      return reply.code(404).send({ error: "Server not found" });
    }

    const command = request.body?.command;
    if (!command || typeof command !== "string") {
      return reply.code(400).send({ error: "command required" });
    }

    try {
      const response = await rconExec(server, command);
      return { ok: true, response };
    } catch (e) {
      app.log.error({ err: e }, "rcon failed");
      return reply.code(502).send({ error: (e as Error).message });
    }
  }
);

/**
 * MatchZy шлёт сюда события матча. Мы форвардим в Vercel webhook
 * с собственной HMAC-подписью (matchzyForward → vercelWebhookSecret).
 */
app.post("/matchzy/webhook", async (request, reply) => {
  // MatchZy шлёт Authorization: Bearer <token> (см. config.json)
  // Дополнительная подпись не нужна — токен совпадает с sharedSecret.
  const auth = request.headers.authorization;
  const expected = `Bearer ${config.sharedSecret}`;
  if (auth !== expected) {
    return reply.code(401).send({ error: "Invalid auth" });
  }

  if (!config.vercelWebhookUrl) {
    app.log.warn("VERCEL_WEBHOOK_URL not set — dropping matchzy event");
    return { ok: true, forwarded: false };
  }

  const body = JSON.stringify(request.body ?? {});
  const sig = hmacSign(`POST\n/api/internal/match-result\n${bodyHash(body)}`, config.vercelWebhookSecret);

  try {
    const resp = await fetch(config.vercelWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-F16-Signature": sig,
      },
      body,
    });
    return { ok: resp.ok, status: resp.status, forwarded: true };
  } catch (e) {
    app.log.error({ err: e }, "vercel forward failed");
    return reply.code(502).send({ error: (e as Error).message });
  }
});

const port = config.port;
app.listen({ port, host: "127.0.0.1" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(
    `f16-srv-control listening on http://127.0.0.1:${port} · ${config.servers.length} server(s) configured`
  );
});
