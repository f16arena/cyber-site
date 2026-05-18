export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";

type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: "not_found" | "expired" | "already_used" };

async function verifyToken(token: string): Promise<VerifyResult> {
  const v = await prisma.emailVerification.findUnique({
    where: { token },
  });
  if (!v) return { ok: false, reason: "not_found" };
  if (v.usedAt) return { ok: false, reason: "already_used" };
  if (v.expiresAt < new Date()) return { ok: false, reason: "expired" };

  // Подтверждаем — обновляем User.emailVerifiedAt + помечаем токен использованным
  await prisma.$transaction([
    prisma.user.update({
      where: { id: v.userId },
      data: {
        email: v.email,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.emailVerification.update({
      where: { id: v.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, email: v.email };
}

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);

  const result = await verifyToken(token);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <PageContainer maxWidth="narrow" className="py-10">
          {result.ok ? (
            <div className="rounded border border-emerald-500/40 bg-emerald-500/5 p-5">
              <h1 className="text-xl font-bold tracking-tight mb-2 text-emerald-300">
                ✓ Email подтверждён
              </h1>
              <p className="text-[13px] text-text-secondary mb-4">
                <span className="font-mono text-text-primary">
                  {result.email}
                </span>{" "}
                добавлен и подтверждён. Теперь будешь получать уведомления о
                турнирах, приглашениях в команду и матчах.
              </p>
              <Link href="/profile">
                <Button size="md">В профиль</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded border border-rose-500/40 bg-rose-500/5 p-5">
              <h1 className="text-xl font-bold tracking-tight mb-2 text-rose-200">
                Не удалось подтвердить
              </h1>
              <p className="text-[13px] text-text-secondary mb-4">
                {result.reason === "expired" &&
                  "Срок действия ссылки истёк. Запроси новое письмо в /profile/edit."}
                {result.reason === "already_used" &&
                  "Эта ссылка уже была использована."}
                {result.reason === "not_found" &&
                  "Ссылка недействительна. Возможно она была удалена или скопирована не полностью."}
              </p>
              <Link href="/profile/edit">
                <Button size="md" variant="secondary">
                  Запросить новое подтверждение
                </Button>
              </Link>
            </div>
          )}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
