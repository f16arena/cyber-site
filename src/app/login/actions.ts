"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authenticateAdmin } from "@/lib/admin-auth";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export type AdminLoginActionResult =
  | { ok: false; error: string }
  | { ok: true; redirectTo: string }; // НЕ возвращается фактически — делаем redirect

/**
 * Серверное действие логина суперадмина. На входе — login/password.
 * При успехе пишет сессию и редиректит на /admin (или ?to=...).
 */
export async function adminLoginAction(
  formData: FormData
): Promise<AdminLoginActionResult> {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const to = String(formData.get("to") ?? "/admin");

  if (!login || !password) {
    return { ok: false, error: "missing_fields" };
  }

  // 5 попыток в 5 минут на IP
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ||
    hdrs.get("x-real-ip") ||
    "unknown";
  const limit = rateLimit(`admin-login:${ip}`, 5, 5 * 60_000);
  if (!limit.allowed) {
    return { ok: false, error: "too_many_attempts" };
  }

  const result = await authenticateAdmin(login, password);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const session = await getSession();
  session.userId = result.userId;
  session.steamId = `admin_${login}`;
  session.username = result.username;
  session.avatarUrl = result.avatarUrl ?? undefined;
  session.isAdmin = true;
  await session.save();

  // Защита от open redirect — пускаем только относительные пути
  const safeTo = to.startsWith("/") && !to.startsWith("//") ? to : "/admin";
  redirect(safeTo);
}
