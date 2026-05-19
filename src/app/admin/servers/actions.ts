"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/server/crypto";
import { execRconRemote } from "@/lib/server/control-client";
import { logServerCommand } from "@/lib/server/audit";

export type ServerFormState = { ok?: boolean; error?: string };

const IP_RE = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[\w.-]+$/;

export async function createGameServer(
  _prev: ServerFormState,
  formData: FormData
): Promise<ServerFormState> {
  await requireAdmin();

  const name = ((formData.get("name") as string | null) ?? "").trim();
  const ip = ((formData.get("ip") as string | null) ?? "").trim();
  const port = parseInt((formData.get("port") as string | null) ?? "27015", 10);
  const rconPort = parseInt(
    (formData.get("rconPort") as string | null) ?? "27015",
    10
  );
  const rconPassword = (
    (formData.get("rconPassword") as string | null) ?? ""
  ).trim();
  const notes = ((formData.get("notes") as string | null) ?? "").trim();

  if (name.length < 2 || name.length > 40) {
    return { error: "Name: 2–40 символов" };
  }
  if (!ip.match(IP_RE)) {
    return { error: "IP неверный формат (IPv4 или hostname)" };
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    return { error: "Port: 1..65535" };
  }
  if (rconPassword.length < 6) {
    return { error: "RCON-пароль слишком короткий (≥6)" };
  }

  // Уникальность ip:port
  const exists = await prisma.gameServer.findFirst({
    where: { ip, port },
  });
  if (exists) return { error: "Сервер с таким IP:PORT уже есть" };

  await prisma.gameServer.create({
    data: {
      name,
      ip,
      port,
      rconPort,
      rconPassword: encryptSecret(rconPassword),
      notes: notes || null,
    },
  });

  revalidatePath("/admin/servers");
  redirect("/admin/servers");
}

export async function updateGameServer(
  _prev: ServerFormState,
  formData: FormData
): Promise<ServerFormState> {
  await requireAdmin();

  const id = formData.get("id") as string | null;
  if (!id) return { error: "id отсутствует" };

  const name = ((formData.get("name") as string | null) ?? "").trim();
  const ip = ((formData.get("ip") as string | null) ?? "").trim();
  const port = parseInt((formData.get("port") as string | null) ?? "27015", 10);
  const rconPort = parseInt(
    (formData.get("rconPort") as string | null) ?? "27015",
    10
  );
  const newRconPassword = (
    (formData.get("rconPassword") as string | null) ?? ""
  ).trim();
  const notes = ((formData.get("notes") as string | null) ?? "").trim();

  if (name.length < 2) return { error: "Name слишком короткое" };
  if (!ip.match(IP_RE)) return { error: "IP неверный формат" };
  if (!Number.isFinite(port) || port < 1 || port > 65535)
    return { error: "Port: 1..65535" };

  const data: {
    name: string;
    ip: string;
    port: number;
    rconPort: number;
    notes: string | null;
    rconPassword?: string;
  } = {
    name,
    ip,
    port,
    rconPort,
    notes: notes || null,
  };
  if (newRconPassword.length >= 6) {
    data.rconPassword = encryptSecret(newRconPassword);
  }

  await prisma.gameServer.update({ where: { id }, data });

  revalidatePath("/admin/servers");
  revalidatePath(`/admin/servers/${id}`);
  return { ok: true };
}

export async function deleteGameServer(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string | null;
  if (!id) return;
  await prisma.gameServer.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/servers");
  redirect("/admin/servers");
}

/**
 * RCON-команда. Шлём через srv-control. Логируем результат в
 * ServerCommandLog независимо от успеха.
 */
export async function execServerCommand(formData: FormData) {
  const admin = await requireAdmin();
  const serverId = formData.get("serverId") as string | null;
  const command = ((formData.get("command") as string | null) ?? "").trim();
  if (!serverId || !command) return;

  const server = await prisma.gameServer.findUnique({
    where: { id: serverId },
  });
  if (!server) return;

  const result = await execRconRemote(serverId, command);
  await logServerCommand({
    serverId,
    adminId: admin.id,
    command,
    response: result.ok ? result.response : result.error,
    success: result.ok,
  });

  revalidatePath(`/admin/servers/${serverId}`);
}
