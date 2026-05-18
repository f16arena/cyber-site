export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TeamEditForm } from "./form";
import {
  kickMember,
  uploadTeamLogo,
  approveJoinRequest,
  declineJoinRequest,
  generateTeamInviteToken,
  revokeTeamInviteToken,
} from "../../actions";
import { ImageUploader } from "@/components/ImageUploader";

function formatExpiry(date: Date | null): string {
  if (!date) return "бессрочно";
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "истёк";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `через ${days} дн`;
  const hours = Math.floor(ms / 3_600_000);
  return `через ${hours}ч`;
}

export default async function TeamEditPage({
  params,
}: {
  params: Promise<{ locale: string; tag: string }>;
}) {
  const { locale, tag: rawTag } = await params;
  const tag = decodeURIComponent(rawTag).toUpperCase();

  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/steam");

  const team = await prisma.team.findUnique({
    where: { tag },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      joinRequests: {
        where: { status: "PENDING" },
        include: {
          user: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      inviteTokens: {
        where: { isRevoked: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!team) notFound();
  if (team.captainId !== me.id) redirect(`/teams/${tag}`);

  const siteUrl = process.env.SITE_URL || "http://localhost:3000";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer maxWidth="narrow" className="py-8">
          <Link
            href={`/teams/${team.tag}`}
            className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-4"
          >
            ← К команде
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-bold tracking-tight">
              Редактирование команды
            </h1>
            <Badge variant="yellow" size="sm">
              {team.game}
            </Badge>
          </div>
          <p className="text-text-secondary text-[13px] mb-8">
            {team.name}{" "}
            <span className="font-mono text-text-muted">[{team.tag}]</span>
          </p>

          {/* Logo */}
          <section className="rounded border border-border-default bg-bg-panel p-4 mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
              Логотип
            </h2>
            <ImageUploader
              currentUrl={team.logoUrl}
              action={uploadTeamLogo}
              extraFields={{ teamId: team.id }}
              label="Лого"
              hint="PNG / JPG / WebP. До 1 МБ. Лучше 256×256."
            />
          </section>

          {/* Edit form */}
          <section className="mb-5">
            <TeamEditForm team={team} />
          </section>

          {/* Invite tokens */}
          <section className="rounded border border-brand-yellow/40 bg-bg-panel p-4 mb-5">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-2">
              Invite-ссылки
            </h2>
            <p className="text-[12px] text-text-secondary mb-3 leading-relaxed">
              Создай invite-ссылку и скинь её тиммейту. По ней он
              автоматически вступит в команду — после Steam-логина, если ещё
              не залогинен. Можно ограничить срок действия и число
              использований.
            </p>

            <form
              action={generateTeamInviteToken}
              className="flex flex-wrap items-end gap-2 mb-4 pb-4 border-b border-border-default"
            >
              <input type="hidden" name="teamId" value={team.id} />
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="expiresInDays"
                  className="text-[10px] font-mono uppercase tracking-wide text-text-muted"
                >
                  Срок (дней)
                </label>
                <select
                  id="expiresInDays"
                  name="expiresInDays"
                  defaultValue="7"
                  className="bg-bg-elevated border border-border-default rounded-sm h-8 px-2 text-[12px] focus:outline-none focus:border-brand-yellow"
                >
                  <option value="1">1 день</option>
                  <option value="3">3 дня</option>
                  <option value="7">7 дней</option>
                  <option value="30">30 дней</option>
                  <option value="0">бессрочно</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="maxUses"
                  className="text-[10px] font-mono uppercase tracking-wide text-text-muted"
                >
                  Макс использований
                </label>
                <select
                  id="maxUses"
                  name="maxUses"
                  defaultValue=""
                  className="bg-bg-elevated border border-border-default rounded-sm h-8 px-2 text-[12px] focus:outline-none focus:border-brand-yellow"
                >
                  <option value="">без лимита</option>
                  <option value="1">1</option>
                  <option value="3">3</option>
                  <option value="6">6</option>
                  <option value="10">10</option>
                </select>
              </div>
              <Button type="submit" size="md">
                Создать ссылку
              </Button>
            </form>

            {team.inviteTokens.length === 0 ? (
              <p className="text-[12px] text-text-muted">
                Активных инвайт-ссылок нет.
              </p>
            ) : (
              <div className="space-y-2">
                {team.inviteTokens.map((t) => {
                  const url = `${siteUrl}/${locale}/teams/join/${encodeURIComponent(t.token)}`;
                  const expired = t.expiresAt && t.expiresAt < new Date();
                  const exhausted =
                    t.maxUses !== null && t.usedCount >= t.maxUses;
                  return (
                    <div
                      key={t.id}
                      className="rounded-sm border border-border-default bg-bg-elevated p-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px] font-mono text-text-muted">
                        <span>{formatExpiry(t.expiresAt)}</span>
                        <span>·</span>
                        <span>
                          использовано {t.usedCount}
                          {t.maxUses !== null ? `/${t.maxUses}` : ""}
                        </span>
                        {(expired || exhausted) && (
                          <Badge variant="finished" size="sm">
                            {expired ? "истёк" : "исчерпан"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={url}
                          className="flex-1 bg-bg-base border border-border-default rounded-sm h-7 px-2 text-[11px] font-mono text-text-secondary"
                          onFocus={(e) => e.currentTarget.select()}
                        />
                        <form action={revokeTeamInviteToken}>
                          <input type="hidden" name="tokenId" value={t.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-rose-300 hover:text-rose-200"
                          >
                            отозвать
                          </Button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pending join requests (для PRIVATE команд) */}
          {team.joinRequests.length > 0 && (
            <section className="rounded border border-brand-yellow/40 bg-bg-panel p-4 mb-5">
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-brand-yellow mb-3">
                Заявки на вступление ({team.joinRequests.length})
              </h2>
              <div className="space-y-2">
                {team.joinRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 p-2.5 rounded-sm border border-border-default bg-bg-elevated"
                  >
                    {r.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.user.avatarUrl}
                        alt={r.user.username}
                        className="w-9 h-9 border border-border-default"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-bg-base border border-border-default" />
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/players/${encodeURIComponent(r.user.username)}`}
                        className="font-semibold text-sm text-text-primary hover:text-brand-yellow"
                      >
                        {r.user.username}
                      </Link>
                      {r.message && (
                        <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
                          {r.message}
                        </p>
                      )}
                      <div className="text-[10px] font-mono text-text-muted mt-1">
                        {r.createdAt.toLocaleString("ru-RU")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <form action={approveJoinRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30"
                          variant="ghost"
                        >
                          ✓ Принять
                        </Button>
                      </form>
                      <form action={declineJoinRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="text-rose-300 hover:text-rose-200"
                        >
                          ✗ Отклонить
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Members */}
          <section className="rounded border border-border-default bg-bg-panel p-4">
            <h2 className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
              Состав ({team.members.length})
            </h2>
            <div className="space-y-1.5">
              {team.members.map((m) => {
                const isCaptain = m.userId === team.captainId;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 rounded-sm border border-border-default bg-bg-elevated"
                  >
                    {m.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user.avatarUrl}
                        alt={m.user.username}
                        className="w-8 h-8 border border-border-default"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-bg-base border border-border-default" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-text-primary flex items-center gap-2">
                        {m.user.username}
                        {isCaptain && (
                          <Badge variant="yellow" size="sm">
                            CAPTAIN
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-text-muted">
                        {m.role}
                      </div>
                    </div>
                    {!isCaptain && (
                      <form action={kickMember}>
                        <input type="hidden" name="teamId" value={team.id} />
                        <input
                          type="hidden"
                          name="memberId"
                          value={m.userId}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-rose-300 hover:text-rose-200"
                        >
                          Выгнать
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
