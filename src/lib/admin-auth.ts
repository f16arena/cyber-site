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

/**
 * Идемпотентно создаёт суперадмина из env-переменных SUPERADMIN_LOGIN и
 * SUPERADMIN_PASSWORD. Если запись с таким login уже есть — НЕ перезаписывает
 * пароль (чтобы плановая ротация env не сбрасывала пароль случайно).
 *
 * Использовать на проде вместо ручного npm run hub:create-admin —
 * достаточно задать переменные в Vercel и открыть /login один раз.
 *
 * Возвращает: created | exists | skipped.
 */
export async function ensureSuperadminFromEnv(): Promise<
  "created" | "exists" | "skipped"
> {
  const login = process.env.SUPERADMIN_LOGIN?.trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!login || !password) return "skipped";
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(login)) return "skipped";
  if (password.length < 8) return "skipped";

  const existing = await prisma.adminCredential.findUnique({
    where: { login },
    select: { id: true },
  });
  if (existing) return "exists";

  // Подбираем username без коллизии
  let username = login;
  const conflict = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (conflict) username = `${login}_admin`;

  const passwordHash = await hashPassword(password);
  const steamId = `admin_${login}`;

  try {
    await prisma.user.create({
      data: {
        steamId,
        username,
        isAdmin: true,
        adminCredential: { create: { login, passwordHash } },
      },
    });
    return "created";
  } catch (e) {
    // Гонка между двумя запросами — один из них словит unique constraint
    const msg = (e as Error).message;
    if (msg.includes("Unique constraint")) return "exists";
    throw e;
  }
}

export type AdminLoginResult =
  | { ok: true; userId: string; username: string; avatarUrl: string | null }
  | { ok: false; error: "invalid_credentials" | "db_not_migrated" };

function isMissingTableError(e: unknown): boolean {
  const msg = (e as Error)?.message ?? "";
  return (
    /does not exist/i.test(msg) ||
    /relation .* does not exist/i.test(msg) ||
    /AdminCredential/i.test(msg) && /does not exist/i.test(msg)
  );
}

/**
 * Аутентификация по login/password. timing-safe — всегда выполняется хэширование,
 * даже если запись не найдена, чтобы не лить timing-info наружу.
 */
export async function authenticateAdmin(
  login: string,
  password: string
): Promise<AdminLoginResult> {
  let cred: {
    id: string;
    passwordHash: string;
    user: { id: string; username: string; avatarUrl: string | null; isAdmin: boolean };
  } | null;
  try {
    cred = await prisma.adminCredential.findUnique({
      where: { login },
      select: {
        id: true,
        passwordHash: true,
        user: { select: { id: true, username: true, avatarUrl: true, isAdmin: true } },
      },
    });
  } catch (e) {
    if (isMissingTableError(e)) {
      return { ok: false, error: "db_not_migrated" };
    }
    throw e;
  }

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
