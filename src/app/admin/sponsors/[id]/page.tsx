export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ImageUploader } from "@/components/ImageUploader";
import { adminUploadSponsorLogo, deleteSponsor } from "../../actions";
import { SponsorAdminForm } from "./form";

export default async function AdminSponsorEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const sponsor = await prisma.sponsor.findUnique({ where: { id } });
  if (!sponsor) notFound();

  return (
    <main className="flex-1 mx-auto max-w-3xl w-full px-6 py-8">
      <Link
        href="/admin/sponsors"
        className="text-xs font-mono text-zinc-500 hover:text-violet-300 inline-flex items-center gap-1 mb-6"
      >
        ← Спонсоры
      </Link>
      <h1 className="text-2xl font-black tracking-tight mb-2">{sponsor.name}</h1>
      <p className="text-zinc-400 mb-8 text-sm">
        {sponsor.tier} · {sponsor.isActive ? "активен" : "архив"}
      </p>

      <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-violet-400 mb-3">
          Логотип
        </h2>
        <ImageUploader
          currentUrl={sponsor.logoUrl}
          action={adminUploadSponsorLogo}
          extraFields={{ id: sponsor.id }}
          label="Лого спонсора"
          hint="PNG / SVG-как-PNG. Лучше с прозрачностью. До 1 МБ."
        />
      </section>

      <SponsorAdminForm
        sponsor={{
          id: sponsor.id,
          name: sponsor.name,
          tier: sponsor.tier,
          websiteUrl: sponsor.websiteUrl,
          monthlyFeeKzt: sponsor.monthlyFeeKzt,
          notes: sponsor.notes,
        }}
      />

      <section className="mt-6 rounded-lg border border-rose-500/20 bg-rose-500/5 p-5">
        <h2 className="text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
          ⚠ Опасная зона
        </h2>
        <form action={deleteSponsor}>
          <input type="hidden" name="id" value={sponsor.id} />
          <button
            type="submit"
            className="text-xs font-mono px-4 h-9 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-300"
          >
            Удалить
          </button>
        </form>
      </section>
    </main>
  );
}
