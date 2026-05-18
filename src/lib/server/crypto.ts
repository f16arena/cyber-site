import crypto from "node:crypto";

/**
 * Шифрование секретов (RCON-паролей серверов) в БД.
 *
 * Формат хранения: префикс + base64.
 *  - "v1:" + base64(iv(12) || ciphertext || authTag(16)) — AES-256-GCM
 *  - "plain:" + value — dev-fallback (без SERVER_ENCRYPTION_KEY)
 *
 * В production SERVER_ENCRYPTION_KEY обязателен. Это hex-строка 64 символа (32 байта).
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function getKey(): Buffer | null {
  const raw = process.env.SERVER_ENCRYPTION_KEY;
  if (!raw) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "SERVER_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)"
    );
  }
  return Buffer.from(raw, "hex");
}

let warnedAboutMissingKey = false;

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production" && !warnedAboutMissingKey) {
      console.warn(
        "[server/crypto] SERVER_ENCRYPTION_KEY is not set — RCON passwords are stored in plain text. Set the env (64 hex chars) to enable encryption."
      );
      warnedAboutMissingKey = true;
    }
    return `plain:${plaintext}`;
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, encrypted, authTag]).toString("base64");
  return `v1:${payload}`;
}

export function decryptSecret(stored: string): string {
  if (stored.startsWith("plain:")) {
    return stored.slice("plain:".length);
  }
  if (stored.startsWith("v1:")) {
    const key = getKey();
    if (!key) {
      throw new Error(
        "SERVER_ENCRYPTION_KEY missing — cannot decrypt v1:secret. Set the env var."
      );
    }
    const buf = Buffer.from(stored.slice(3), "base64");
    const iv = buf.subarray(0, IV_LEN);
    const authTag = buf.subarray(buf.length - AUTH_TAG_LEN);
    const ciphertext = buf.subarray(IV_LEN, buf.length - AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
  return stored;
}

/**
 * HMAC-SHA256 для подписи запросов между Vercel и srv-control дома.
 * Возвращает base64url-подпись.
 */
export function hmacSign(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function hmacVerify(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = hmacSign(payload, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
