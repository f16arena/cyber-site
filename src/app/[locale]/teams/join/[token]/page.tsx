export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getSession } from "@/lib/session";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { acceptTeamInviteByToken } from "../../actions";

const ERROR_LABELS: Record<string, string> = {
  not_found: "Инвайт-ссылка не найдена или была удалена.",
  revoked: "Этот инвайт уже отозван капитаном.",
  expired: "Срок действия инвайта истёк.",
  exhausted: "Инвайт уже использован максимальное число раз.",
  in_other_team:
    "Вы уже состоите в другой команде по этой дисциплине. Покиньте её, чтобы принять новый инвайт.",
  team_full: "Состав команды укомплектован.",
  not_authenticated: "Нужно войти через Steam.",
};

export default async function JoinByTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale, token: rawToken } = await params;
  const sp = await searchParams;
  const token = decodeURIComponent(rawToken);

  const user = await getCurrentUser();

  // Не залогинен — сохраним токен в сессию и отправим на Steam-логин.
  if (!user) {
    const session = await getSession();
    session.pendingRedirect = `/${locale}/teams/join/${encodeURIComponent(token)}`;
    await session.save();
    redirect("/api/auth/steam");
  }

  // Если был редирект с ошибкой из server-action — покажем её
  if (sp.error) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <PageContainer maxWidth="narrow" className="py-10">
            <h1 className="text-xl font-bold tracking-tight mb-3">
              Не удалось принять приглашение
            </h1>
            <p className="text-text-secondary mb-4">
              {ERROR_LABELS[sp.error] ?? "Неизвестная ошибка"}
            </p>
            <Link
              href="/teams"
              className="text-brand-blue hover:text-brand-blue-hover text-sm"
            >
              ← К списку команд
            </Link>
          </PageContainer>
        </main>
        <SiteFooter />
      </>
    );
  }

  // Загружаем инвайт без побочных эффектов (только превью + ссылка на accept).
  const invite = await prisma.teamInviteToken.findUnique({
    where: { token },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          tag: true,
          game: true,
          logoUrl: true,
          captain: { select: { username: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!invite) {
    return (
      <>
        <SiteHeader />
        <main className="flex-1">
          <PageContainer maxWidth="narrow" className="py-10">
            <h1 className="text-xl font-bold tracking-tight mb-3">
              Инвайт не найден
            </h1>
            <p className="text-text-secondary mb-4">
              Эта ссылка-приглашение не существует или была удалена.
            </p>
            <Link
              href="/teams"
              className="text-brand-blue hover:text-brand-blue-hover text-sm"
            >
              ← К списку команд
            </Link>
          </PageContainer>
        </main>
        <SiteFooter />
      </>
    );
  }

  const expired = invite.expiresAt && invite.expiresAt < new Date();
  const exhausted =
    invite.maxUses !== null && invite.usedCount >= invite.maxUses;
  const inviteStatus = invite.isRevoked
    ? "revoked"
    : expired
    ? "expired"
    : exhausted
    ? "exhausted"
    : "active";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer maxWidth="narrow" className="py-10">
          <Link
            href="/teams"
            className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-6"
          >
            ← Команды
          </Link>

          <h1 className="text-xl font-bold tracking-tight mb-1">
            Приглашение в команду
          </h1>
          <p className="text-text-secondary text-[13px] mb-6">
            Капитан{" "}
            <span className="text-text-primary font-medium">
              {invite.team.captain.username}
            </span>{" "}
            приглашает вас в свою команду.
          </p>

          <div className="rounded border border-border-default bg-bg-panel p-5 mb-5 flex items-center gap-4">
            {invite.team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invite.team.logoUrl}
                alt={invite.team.name}
                className="w-16 h-16 border border-border-default"
              />
            ) : (
              <div className="w-16 h-16 bg-bg-elevated border border-border-default flex items-center justify-center text-2xl font-bold text-text-secondary">
                {invite.team.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="yellow" size="sm">
                  {invite.team.game}
                </Badge>
                <span className="text-xs font-mono text-text-muted">
                  [{invite.team.tag}]
                </span>
              </div>
              <h2 className="text-base font-bold text-text-primary">
                {invite.team.name}
              </h2>
              <p className="text-[11px] font-mono text-text-muted mt-1">
                {invite.team._count.members} в составе
              </p>
            </div>
          </div>

          {inviteStatus !== "active" ? (
            <div className="rounded border border-rose-500/40 bg-rose-500/10 p-4 text-[13px] text-rose-200">
              {ERROR_LABELS[inviteStatus] ??
                "Этот инвайт больше не активен."}
            </div>
          ) : (
            <form action={acceptInviteAction} className="flex flex-col gap-3">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="h-10 px-5 rounded-sm bg-brand-yellow hover:bg-brand-yellow-hover text-text-on-yellow font-bold uppercase tracking-wide text-sm"
              >
                Принять приглашение
              </button>
              <Link
                href={`/teams/${invite.team.tag}`}
                className="text-[11px] font-mono text-text-muted hover:text-text-secondary text-center"
              >
                посмотреть страницу команды »
              </Link>
            </form>
          )}

          {invite.expiresAt && inviteStatus === "active" && (
            <p className="text-[11px] font-mono text-text-muted mt-4">
              Действителен до{" "}
              {invite.expiresAt.toLocaleString("ru-RU", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {invite.maxUses !== null && (
                <>
                  {" · "}использовано {invite.usedCount}/{invite.maxUses}
                </>
              )}
            </p>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

async function acceptInviteAction(formData: FormData) {
  "use server";
  const token = formData.get("token") as string | null;
  if (!token) return;
  const result = await acceptTeamInviteByToken(token);
  if (result.ok) {
    redirect(`/teams/${result.teamTag}`);
  } else {
    // server actions с redirect нельзя возвращать значения,
    // поэтому передаём ошибку через query-param
    redirect(`/teams/join/${encodeURIComponent(token)}?error=${result.error}`);
  }
}
