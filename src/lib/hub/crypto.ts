import crypto from "node:crypto";

/**
 * Шифрование секретов (RCON-паролей серверов) в БД.
 *
 * Формат хранения: префикс + base64.
 *  - "v1:" + base64(iv(12) || ciphertext || authTag(16)) — AES-256-GCM
 *  - "plain:" + value — dev-fallback (без HUB_ENCRYPTION_KEY)
 *
 * В production HUB_ENCRYPTION_KEY обязателен. Это hex-строка 64 символа (32 байта).
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function getKey(): Buffer | null {
  const raw = process.env.HUB_ENCRYPTION_KEY;
  if (!raw) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      "HUB_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)"
    );
  }
  return Buffer.from(raw, "hex");
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("HUB_ENCRYPTION_KEY is required in production");
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
        "HUB_ENCRYPTION_KEY missing — cannot decrypt v1:secret. Set the env var."
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
  // Legacy — если уже лежит plain без префикса (старые записи), возвращаем как есть
  return stored;
}
