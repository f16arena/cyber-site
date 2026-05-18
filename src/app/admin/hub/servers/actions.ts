"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { encryptSecret } from "@/lib/hub/crypto";

export type ServerActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createHubServer(formData: FormData): Promise<ServerActionResult> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const ip = String(formData.get("ip") ?? "").trim();
  const portRaw = String(formData.get("port") ?? "").trim();
  const rconPassword = String(formData.get("rconPassword") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { ok: false, error: "name_required" };
  if (!/^([0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/.test(ip)) {
    return { ok: false, error: "ip_invalid" };
  }
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { ok: false, error: "port_invalid" };
  }
  if (!rconPassword || rconPassword.length < 4) {
    return { ok: false, error: "rcon_too_short" };
  }

  try {
    const existing = await prisma.hubServer.findUnique({
      where: { ip_port: { ip, port } },
      select: { id: true },
    });
    if (existing) return { ok: false, error: "ip_port_exists" };

    const created = await prisma.hubServer.create({
      data: {
        name,
        ip,
        port,
        rconPassword: encryptSecret(rconPassword),
        status: "FREE",
        notes,
      },
      select: { id: true },
    });

    await prisma.adminActionLog.create({
      data: {
        adminId: admin.id,
        action: "HUB_SERVER_CREATE",
        entity: "hub_server",
        entityId: created.id,
        metadata: { name, ip, port } as object,
      },
    });

    revalidatePath("/admin/hub/servers");
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[admin:hub:server-create] failed:", msg);
    if (/does not exist/i.test(msg) || /relation .* does not exist/i.test(msg)) {
      return { ok: false, error: "db_not_migrated" };
    }
    return { ok: false, error: `unexpected: ${msg.slice(0, 200)}` };
  }
}

export async function deleteHubServer(id: string): Promise<ServerActionResult> {
  const admin = await requireAdmin();

  const server = await prisma.hubServer.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, reservedForLobbyId: true },
  });
  if (!server) return { ok: false, error: "not_found" };
  if (server.status !== "FREE" && server.status !== "OFFLINE") {
    return { ok: false, error: "server_in_use" };
  }

  await prisma.hubServer.delete({ where: { id } });

  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_SERVER_DELETE",
      entity: "hub_server",
      entityId: id,
      metadata: { name: server.name } as object,
    },
  });

  revalidatePath("/admin/hub/servers");
  return { ok: true };
}

export async function toggleHubServerOffline(
  id: string
): Promise<ServerActionResult> {
  const admin = await requireAdmin();

  const s = await prisma.hubServer.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!s) return { ok: false, error: "not_found" };
  if (s.status === "RESERVED" || s.status === "LIVE") {
    return { ok: false, error: "server_in_use" };
  }

  const newStatus = s.status === "OFFLINE" ? "FREE" : "OFFLINE";
  await prisma.hubServer.update({
    where: { id },
    data: { status: newStatus },
  });

  await prisma.adminActionLog.create({
    data: {
      adminId: admin.id,
      action: "HUB_SERVER_TOGGLE",
      entity: "hub_server",
      entityId: id,
      metadata: { newStatus } as object,
    },
  });

  revalidatePath("/admin/hub/servers");
  return { ok: true };
}
