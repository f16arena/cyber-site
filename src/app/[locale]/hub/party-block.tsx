"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type PartyMember = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  hubElo: number;
  isLeader: boolean;
};

type PartyInvite = {
  id: string;
  invitedUserId: string;
  invitedUsername: string;
  avatarUrl: string | null;
};

type IncomingInvite = {
  id: string;
  partyId: string;
  leaderUsername: string;
  leaderAvatar: string | null;
  leaderElo: number;
  memberCount: number;
};

const ERR: Record<string, string> = {
  already_in_party: "Вы уже в другой party",
  in_queue: "Сначала выйдите из очереди",
  in_lobby: "Вы в активном лобби",
  not_leader: "Только лидер может приглашать",
  party_full: "Party заполнена (макс 5)",
  target_not_found: "Игрок не найден",
  target_already_in_party: "Игрок уже в другой party",
  self_invite: "Себя приглашать нельзя",
  already_invited: "Приглашение уже отправлено",
  invite_not_found: "Приглашение не найдено",
  invite_expired: "Приглашение истекло",
};

export function PartyBlock({
  meUserId,
  party,
  incoming,
}: {
  meUserId: string;
  party: {
    id: string;
    leaderId: string;
    members: PartyMember[];
    pendingInvites: PartyInvite[];
  } | null;
  incoming: IncomingInvite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);

  const call = async (
    url: string,
    body?: object
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      return { ok: res.ok && !!data.ok, error: data.error };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const onCreate = () => {
    setError(null);
    startTransition(async () => {
      const res = await call("/api/hub/party/create");
      if (!res.ok) setError(ERR[res.error ?? ""] ?? res.error ?? "Ошибка");
      else router.refresh();
    });
  };

  const onLeave = () => {
    if (!confirm("Покинуть party?")) return;
    setError(null);
    startTransition(async () => {
      const res = await call("/api/hub/party/leave");
      if (!res.ok) setError(ERR[res.error ?? ""] ?? res.error ?? "Ошибка");
      else router.refresh();
    });
  };

  const onInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await call("/api/hub/party/invite", {
        identifier: inviteIdentifier.trim(),
      });
      if (!res.ok) {
        setError(ERR[res.error ?? ""] ?? res.error ?? "Ошибка");
      } else {
        setInviteIdentifier("");
        router.refresh();
      }
    });
  };

  const onRespond = (inviteId: string, accept: boolean) => {
    setError(null);
    startTransition(async () => {
      const res = await call("/api/hub/party/respond", { inviteId, accept });
      if (!res.ok) setError(ERR[res.error ?? ""] ?? res.error ?? "Ошибка");
      else router.refresh();
    });
  };

  // Входящие инвайты — приоритетнее всего
  if (incoming.length > 0 && !party) {
    return (
      <section className="rounded-xl border border-orange-500/30 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-mono uppercase tracking-widest text-orange-300 mb-3">
          Приглашения в party
        </h2>
        <div className="space-y-2">
          {incoming.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
            >
              {inv.leaderAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inv.leaderAvatar}
                  alt={inv.leaderUsername}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                  {inv.leaderUsername[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{inv.leaderUsername}</div>
                <div className="text-[11px] font-mono text-zinc-500">
                  {inv.leaderElo} ELO · {inv.memberCount} в party
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRespond(inv.id, true)}
                  className="text-xs font-bold px-3 h-9 rounded bg-gradient-to-r from-orange-500 to-rose-600 text-white disabled:opacity-50"
                >
                  Принять
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRespond(inv.id, false)}
                  className="text-xs font-mono px-3 h-9 rounded border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
        {error && (
          <div className="mt-3 text-xs font-mono text-rose-300">{error}</div>
        )}
      </section>
    );
  }

  if (!party) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-400">
              Party (играть с друзьями)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Соберите группу до 5 человек — попадёте в одну команду.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={pending}
            className="h-10 px-4 rounded font-bold border border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 text-sm disabled:opacity-50"
          >
            Создать party
          </button>
        </div>
        {error && (
          <div className="mt-3 text-xs font-mono text-rose-300">{error}</div>
        )}
      </section>
    );
  }

  const iAmLeader = party.leaderId === meUserId;

  return (
    <section className="rounded-xl border border-orange-500/30 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-sm font-mono uppercase tracking-widest text-orange-300">
          Ваша party · {party.members.length} / 5
        </h2>
        <button
          type="button"
          onClick={onLeave}
          disabled={pending}
          className="text-xs font-mono px-3 h-9 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
        >
          {iAmLeader ? "Распустить" : "Покинуть"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {party.members.map((m) => (
          <div
            key={m.userId}
            className={`relative rounded-lg border p-2 text-center ${
              m.isLeader
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-zinc-800 bg-zinc-900/50"
            }`}
          >
            {m.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.avatarUrl}
                alt={m.username}
                className="w-10 h-10 rounded mx-auto mb-1 object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-zinc-800 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-zinc-500">
                {m.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-[10px] font-mono truncate text-zinc-300">
              {m.isLeader && "⭐ "}
              {m.username}
            </div>
            <div className="text-[9px] font-mono text-zinc-500">{m.hubElo}</div>
          </div>
        ))}
        {Array.from({ length: 5 - party.members.length }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 h-[88px]"
          />
        ))}
      </div>

      {iAmLeader && party.members.length < 5 && (
        <form onSubmit={onInvite} className="flex gap-2 mb-3">
          <input
            type="text"
            value={inviteIdentifier}
            onChange={(e) => setInviteIdentifier(e.target.value)}
            placeholder="username или SteamID64"
            className="flex-1 h-10 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm focus:border-orange-500 outline-none"
          />
          <button
            type="submit"
            disabled={pending || !inviteIdentifier.trim()}
            className="h-10 px-4 rounded font-bold text-sm bg-gradient-to-r from-orange-500 to-rose-600 text-white disabled:opacity-50"
          >
            Пригласить
          </button>
        </form>
      )}

      {party.pendingInvites.length > 0 && iAmLeader && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Ожидают ответа ({party.pendingInvites.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {party.pendingInvites.map((inv) => (
              <span
                key={inv.id}
                className="text-[11px] font-mono px-2 py-1 rounded border border-zinc-800 bg-zinc-900/50 text-zinc-400"
              >
                {inv.invitedUsername}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs font-mono text-rose-300">{error}</div>
      )}
    </section>
  );
}
