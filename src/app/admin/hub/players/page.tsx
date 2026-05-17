export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BanControls } from "./ban-controls";

export default async function AdminHubPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = sp.filter ?? "all";

  const now = new Date();
  const where: Parameters<typeof prisma.user.findMany>[0] = {
    where: {
      AND: [
        q
          ? {
              OR: [
                { username: { contains: q, mode: "insensitive" } },
                { steamId: { contains: q } },
              ],
            }
          : {},
        filter === "banned"
          ? { hubBannedUntil: { gt: now } }
          : filter === "cooldown"
          ? { hubCooldownUntil: { gt: now } }
          : filter === "active"
          ? { hubMatchesPlayed: { gt: 0 } }
          : {},
      ],
    },
    orderBy: [{ hubElo: "desc" }],
    take: 100,
    select: {
      id: true,
      steamId: true,
      username: true,
      avatarUrl: true,
      hubElo: true,
      hubWins: true,
      hubLosses: true,
      hubMatchesPlayed: true,
      hubBannedUntil: true,
      hubCooldownUntil: true,
      hubBanReason: true,
    },
  };

  const players = await prisma.user.findMany(where);

  return (
    <div className="p-6 space-y-6">
      <header>
        <div className="text-[10px] font-mono uppercase tracking-widest text-violet-400">
          F16 Hub
        </div>
        <h1 className="text-2xl font-black tracking-tight">Игроки CS2 MM</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Все пользователи hub. Сортировка по ELO. Поиск по нику / SteamID64.
          Бан моментально выкидывает из очереди и блокирует Find Match.
        </p>
      </header>

      <form className="flex items-center gap-2 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="ник или steamId"
          className="h-10 w-72 rounded bg-zinc-900 border border-zinc-800 px-3 text-sm focus:border-violet-500 outline-none"
        />
        <div className="flex gap-1">
          {[
            { v: "all", l: "Все" },
            { v: "active", l: "Играли" },
            { v: "banned", l: "Бан" },
            { v: "cooldown", l: "Cooldown" },
          ].map((f) => (
            <Link
              key={f.v}
              href={`/admin/hub/players?filter=${f.v}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`text-xs font-mono px-3 h-10 inline-flex items-center rounded border ${
                filter === f.v
                  ? "border-violet-500/50 bg-violet-500/10 text-violet-200"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {f.l}
            </Link>
          ))}
        </div>
        <button
          type="submit"
          className="h-10 px-4 rounded bg-violet-500/20 border border-violet-500/40 text-violet-100 text-sm font-bold"
        >
          Найти
        </button>
      </form>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-zinc-500 text-[10px] uppercase tracking-widest font-mono">
            <tr>
              <th className="text-left px-4 py-2">Игрок</th>
              <th className="text-left px-4 py-2">SteamID64</th>
              <th className="text-right px-4 py-2">ELO</th>
              <th className="text-right px-4 py-2">W / L</th>
              <th className="text-left px-4 py-2">Статус</th>
              <th className="text-right px-4 py-2">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {players.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 text-sm">
                  Никого не нашлось
                </td>
              </tr>
            )}
            {players.map((p) => {
              const banned = p.hubBannedUntil && p.hubBannedUntil > now;
              const cooldown = !banned && p.hubCooldownUntil && p.hubCooldownUntil > now;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatarUrl}
                          alt={p.username}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                          {p.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-bold truncate">{p.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                    {p.steamId}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-orange-300">
                    {p.hubElo}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    <span className="text-emerald-300">{p.hubWins}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-rose-300">{p.hubLosses}</span>
                  </td>
                  <td className="px-4 py-3">
                    {banned ? (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-rose-500/15 text-rose-300 border-rose-500/40">
                        BANNED {p.hubBanReason ? `· ${p.hubBanReason}` : ""}
                      </span>
                    ) : cooldown ? (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/40">
                        COOLDOWN до{" "}
                        {p.hubCooldownUntil!.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <BanControls userId={p.id} isBanned={!!banned} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
