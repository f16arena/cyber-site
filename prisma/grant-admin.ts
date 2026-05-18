/**
 * Выдать isAdmin существующему пользователю по username или steamId.
 *
 * Использование:
 *   npx tsx prisma/grant-admin.ts <username-or-steamId>
 *   npm run admin:grant -- <username-or-steamId>
 *
 * Работает с production-БД (читает DATABASE_URL из .env) — будьте осторожны.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: tsx prisma/grant-admin.ts <username-or-steamId>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const looksLikeSteamId = /^\d{17}$/.test(arg);
    const where = looksLikeSteamId ? { steamId: arg } : { username: arg };

    const user = await prisma.user.findUnique({ where });
    if (!user) {
      console.error(
        `User not found by ${looksLikeSteamId ? "steamId" : "username"}: ${arg}`
      );
      console.error("Подсказка: сначала пользователь должен хотя бы раз войти");
      console.error("через Steam (даже если потом сессия сломалась) — User");
      console.error("создаётся в callback. Если запись существует, повторите.");
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`Already admin: ${user.username} (steamId=${user.steamId})`);
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });

    console.log(`OK: ${updated.username} (steamId=${updated.steamId}) -> isAdmin=true`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
