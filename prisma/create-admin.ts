/**
 * Создать суперадмина (отдельно от Steam).
 *
 * Использование:
 *   npm run admin:create -- <login> <password>
 *
 * Создаёт:
 *   - User(steamId="admin_<login>", username=<login>, isAdmin=true)
 *   - AdminCredential(login, passwordHash через scrypt)
 *
 * Если пользователь с таким login уже есть — обновляет passwordHash.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

async function main() {
  const login = process.argv[2];
  const password = process.argv[3];

  if (!login || !password) {
    console.error("Usage: tsx prisma/create-admin.ts <login> <password>");
    process.exit(1);
  }
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(login)) {
    console.error("login: 3-32 chars, latin/digits/_-");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("password: minimum 8 characters");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);

    const existing = await prisma.adminCredential.findUnique({
      where: { login },
      select: { id: true, userId: true },
    });

    if (existing) {
      await prisma.adminCredential.update({
        where: { id: existing.id },
        data: { passwordHash },
      });
      await prisma.user.update({
        where: { id: existing.userId },
        data: { isAdmin: true },
      });
      console.log(`OK: пароль обновлён для login=${login}`);
      return;
    }

    const steamId = `admin_${login}`;
    let username = login;
    const conflict = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (conflict) {
      username = `${login}_admin`;
    }

    const user = await prisma.user.create({
      data: {
        steamId,
        username,
        isAdmin: true,
        adminCredential: {
          create: { login, passwordHash },
        },
      },
      select: { id: true, username: true },
    });

    console.log(`OK: создан админ login=${login} username=${user.username} id=${user.id}`);
    console.log(`Войти: POST /api/auth/admin/login {login, password}`);
    console.log(`Или открыть: /admin/login`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
