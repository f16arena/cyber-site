import crypto from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_LEN = 16;

/**
 * Хэш пароля: `<saltB64>:<hashB64>`.
 * scrypt с дефолтными N=16384 — медленный (~80мс), что нам и нужно для паролей.
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const salt = crypto.randomBytes(SCRYPT_SALT_LEN);
  const hash = await scrypt(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export type AdminLoginResult =
  | { ok: true; userId: string; username: string; avatarUrl: string | null }
  | { ok: false; error: "invalid_credentials" };

/**
 * Аутентификация по login/password. timing-safe — всегда выполняется хэширование,
 * даже если запись не найдена, чтобы не лить timing-info наружу.
 */
export async function authenticateAdmin(
  login: string,
  password: string
): Promise<AdminLoginResult> {
  const cred = await prisma.adminCredential.findUnique({
    where: { login },
    select: {
      id: true,
      passwordHash: true,
      user: { select: { id: true, username: true, avatarUrl: true, isAdmin: true } },
    },
  });

  // Защита от timing-атак: хэшируем пароль даже если запись не найдена
  const fakeStored = "AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
  const valid = await verifyPassword(password, cred?.passwordHash ?? fakeStored);

  if (!cred || !valid) {
    return { ok: false, error: "invalid_credentials" };
  }
  if (!cred.user.isAdmin) {
    return { ok: false, error: "invalid_credentials" };
  }

  await prisma.adminCredential.update({
    where: { id: cred.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    ok: true,
    userId: cred.user.id,
    username: cred.user.username,
    avatarUrl: cred.user.avatarUrl,
  };
}
