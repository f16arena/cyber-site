import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export type ServerConfig = {
  id: string;
  ip: string;
  port: number;
  rconPassword: string;
};

function parseServers(json: string): ServerConfig[] {
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) throw new Error("not an array");
    return arr.map((s, i) => {
      if (typeof s !== "object" || s === null)
        throw new Error(`Server #${i} is not an object`);
      const obj = s as Record<string, unknown>;
      if (typeof obj.id !== "string") throw new Error(`Server #${i}: id missing`);
      if (typeof obj.ip !== "string") throw new Error(`Server #${i}: ip missing`);
      if (typeof obj.port !== "number")
        throw new Error(`Server #${i}: port missing`);
      if (typeof obj.rconPassword !== "string")
        throw new Error(`Server #${i}: rconPassword missing`);
      return {
        id: obj.id,
        ip: obj.ip,
        port: obj.port,
        rconPassword: obj.rconPassword,
      };
    });
  } catch (e) {
    throw new Error(`SERVERS_JSON parse error: ${(e as Error).message}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  sharedSecret: required("SHARED_SECRET"),
  vercelWebhookUrl: process.env.VERCEL_WEBHOOK_URL ?? "",
  vercelWebhookSecret: process.env.VERCEL_WEBHOOK_SECRET ?? "",
  servers: parseServers(process.env.SERVERS_JSON ?? "[]"),
  demosDir: process.env.DEMOS_DIR ?? "",
};
