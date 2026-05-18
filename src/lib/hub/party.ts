import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const MAX_PARTY_SIZE = 5;
export const INVITE_TTL_MS = 60 * 60 * 1000; // 1 час

export type PartyView = {
  id: string;
  leaderId: string;
  leaderUsername: string;
  createdAt: string;
  members: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    hubElo: number;
    isLeader: boolean;
  }[];
  pendingInvites: {
    id: string;
    invitedUserId: string;
    invitedUsername: string;
    avatarUrl: string | null;
    createdAt: string;
  }[];
};

export type CreatePartyResult =
  | { ok: true; partyId: string }
  | { ok: false; error: "already_in_party" | "in_queue" | "in_lobby" };

/** Создать пустую party. Лидер сам в неё входит. */
export async function createParty(userId: string): Promise<CreatePartyResult> {
  return prisma.$transaction(async (tx) => {
    const existingLed = await tx.hubParty.findUnique({
      where: { leaderId: userId },
      select: { id: true },
    });
    if (existingLed) return { ok: true as const, partyId: existingLed.id };

    const existingMember = await tx.hubPartyMember.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existingMember) {
      return { ok: false as const, error: "already_in_party" as const };
    }

    const ticket = await tx.hubQueueTicket.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (ticket) return { ok: false as const, error: "in_queue" as const };

    const party = await tx.hubParty.create({
      data: {
        leaderId: userId,
        members: { create: { userId } },
      },
      select: { id: true },
    });
    return { ok: true as const, partyId: party.id };
  });
}

export type DisbandResult = { ok: true } | { ok: false; error: string };

export async function disbandParty(
  userId: string
): Promise<DisbandResult> {
  return prisma.$transaction(async (tx) => {
    const party = await tx.hubParty.findUnique({
      where: { leaderId: userId },
      select: { id: true, members: { select: { userId: true } } },
    });
    if (!party) return { ok: false as const, error: "not_leader" };

    // Если party в очереди — удалить тикет
    await tx.hubQueueTicket.deleteMany({ where: { partyId: party.id } });
    await tx.hubParty.delete({ where: { id: party.id } });
    return { ok: true as const };
  });
}

export async function leaveParty(
  userId: string
): Promise<DisbandResult> {
  return prisma.$transaction(async (tx) => {
    const member = await tx.hubPartyMember.findUnique({
      where: { userId },
      select: { id: true, partyId: true, party: { select: { leaderId: true } } },
    });
    if (!member) return { ok: false as const, error: "not_in_party" };

    // Если ты лидер — disband целиком
    if (member.party.leaderId === userId) {
      await tx.hubQueueTicket.deleteMany({ where: { partyId: member.partyId } });
      await tx.hubParty.delete({ where: { id: member.partyId } });
      return { ok: true as const };
    }

    await tx.hubPartyMember.delete({ where: { id: member.id } });
    return { ok: true as const };
  });
}

export type InviteResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "not_leader"
        | "party_full"
        | "target_not_found"
        | "target_already_in_party"
        | "self_invite"
        | "already_invited";
    };

/** Лидер приглашает пользователя по username или steamId. */
export async function inviteToParty(
  leaderUserId: string,
  identifier: string
): Promise<InviteResult> {
  return prisma.$transaction(async (tx) => {
    const party = await tx.hubParty.findUnique({
      where: { leaderId: leaderUserId },
      select: {
        id: true,
        _count: { select: { members: true } },
      },
    });
    if (!party) return { ok: false as const, error: "not_leader" };
    if (party._count.members >= MAX_PARTY_SIZE) {
      return { ok: false as const, error: "party_full" };
    }

    const isSteamId = /^\d{17}$/.test(identifier);
    const target = await tx.user.findUnique({
      where: isSteamId ? { steamId: identifier } : { username: identifier },
      select: { id: true },
    });
    if (!target) return { ok: false as const, error: "target_not_found" };
    if (target.id === leaderUserId) {
      return { ok: false as const, error: "self_invite" };
    }

    const inAnotherParty = await tx.hubPartyMember.findUnique({
      where: { userId: target.id },
      select: { id: true },
    });
    if (inAnotherParty) {
      return { ok: false as const, error: "target_already_in_party" };
    }

    const existing = await tx.hubPartyInvite.findUnique({
      where: { partyId_invitedUserId: { partyId: party.id, invitedUserId: target.id } },
      select: { id: true, status: true },
    });
    if (existing && existing.status === "PENDING") {
      return { ok: false as const, error: "already_invited" };
    }
    if (existing) {
      await tx.hubPartyInvite.update({
        where: { id: existing.id },
        data: { status: "PENDING", createdAt: new Date(), respondedAt: null },
      });
    } else {
      await tx.hubPartyInvite.create({
        data: { partyId: party.id, invitedUserId: target.id },
      });
    }

    return { ok: true as const };
  });
}

export type RespondInviteResult =
  | { ok: true; joined: boolean }
  | {
      ok: false;
      error:
        | "invite_not_found"
        | "invite_expired"
        | "party_full"
        | "already_in_party";
    };

export async function respondInvite(
  userId: string,
  inviteId: string,
  accept: boolean
): Promise<RespondInviteResult> {
  return prisma.$transaction(
    async (tx) => {
      const invite = await tx.hubPartyInvite.findUnique({
        where: { id: inviteId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          partyId: true,
          invitedUserId: true,
          party: { select: { _count: { select: { members: true } } } },
        },
      });
      if (!invite || invite.invitedUserId !== userId) {
        return { ok: false as const, error: "invite_not_found" as const };
      }
      if (invite.status !== "PENDING") {
        return { ok: false as const, error: "invite_expired" as const };
      }
      if (Date.now() - invite.createdAt.getTime() > INVITE_TTL_MS) {
        await tx.hubPartyInvite.update({
          where: { id: invite.id },
          data: { status: "DECLINED", respondedAt: new Date() },
        });
        return { ok: false as const, error: "invite_expired" as const };
      }

      await tx.hubPartyInvite.update({
        where: { id: invite.id },
        data: {
          status: accept ? "ACCEPTED" : "DECLINED",
          respondedAt: new Date(),
        },
      });

      if (!accept) return { ok: true as const, joined: false };

      const existingMember = await tx.hubPartyMember.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (existingMember) {
        return { ok: false as const, error: "already_in_party" as const };
      }

      if (invite.party._count.members >= MAX_PARTY_SIZE) {
        return { ok: false as const, error: "party_full" as const };
      }

      await tx.hubPartyMember.create({
        data: { partyId: invite.partyId, userId },
      });
      return { ok: true as const, joined: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/** Снимок party для UI. Возвращает null если у пользователя нет party. */
export async function getPartyForUser(
  userId: string
): Promise<PartyView | null> {
  const member = await prisma.hubPartyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  if (!member) return null;

  const party = await prisma.hubParty.findUnique({
    where: { id: member.partyId },
    select: {
      id: true,
      leaderId: true,
      createdAt: true,
      leader: { select: { username: true } },
      members: {
        select: {
          userId: true,
          user: { select: { username: true, avatarUrl: true, hubElo: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      invites: {
        where: { status: "PENDING" },
        select: {
          id: true,
          invitedUserId: true,
          createdAt: true,
          invitedUser: { select: { username: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!party) return null;

  return {
    id: party.id,
    leaderId: party.leaderId,
    leaderUsername: party.leader.username,
    createdAt: party.createdAt.toISOString(),
    members: party.members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      avatarUrl: m.user.avatarUrl,
      hubElo: m.user.hubElo,
      isLeader: m.userId === party.leaderId,
    })),
    pendingInvites: party.invites.map((i) => ({
      id: i.id,
      invitedUserId: i.invitedUserId,
      invitedUsername: i.invitedUser.username,
      avatarUrl: i.invitedUser.avatarUrl,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

/** Полученные пользователем pending-инвайты. */
export async function getIncomingInvites(userId: string) {
  return prisma.hubPartyInvite.findMany({
    where: {
      invitedUserId: userId,
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - INVITE_TTL_MS) },
    },
    select: {
      id: true,
      createdAt: true,
      party: {
        select: {
          id: true,
          leader: { select: { username: true, avatarUrl: true, hubElo: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
