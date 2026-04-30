import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Проверяет права админа по БД (свежо, не из сессии). */
export async function requireAdmin() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/api/auth/steam");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, isAdmin: true, username: true },
  });

  if (!user || !user.isAdmin) {
    redirect("/?error=admin_required");
  }
  return user;
}

export async function isAdmin() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return false;
  const u = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { isAdmin: true },
  });
  return !!u?.isAdmin;
}
