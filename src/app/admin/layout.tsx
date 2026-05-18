import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { UserMenu } from "@/components/UserMenu";
import { AdminSidebar } from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireAdmin();

  // Бейджи в сайдбаре — счётчики того что требует внимания
  const [pendingMatches, openInquiries, draftTournaments] = await Promise.all([
    prisma.match.count({ where: { status: { in: ["SCHEDULED", "LIVE"] } } }),
    prisma.sponsorshipInquiry.count({ where: { isHandled: false } }),
    prisma.tournament.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <>
      {/* Top bar */}
      <header className="border-b border-border-default bg-bg-base/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="mx-auto max-w-[1600px] flex items-center justify-between px-6 h-12">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded bg-cyan-500 flex items-center justify-center font-bold text-sm text-slate-950">
              F
            </div>
            <span className="font-bold text-base tracking-tight">
              <span className="text-text-primary">F16</span>
              <span className="text-cyan-400 ml-1">ARENA</span>
            </span>
            <span className="ml-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              SUPERADMIN
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-mono text-text-muted hover:text-cyan-300"
            >
              ← На сайт
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex flex-1 mx-auto max-w-[1600px] w-full">
        <AdminSidebar
          adminName={me.username}
          badges={{ pendingMatches, openInquiries, draftTournaments }}
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </>
  );
}
