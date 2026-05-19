import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { PageContainer } from "@/components/layout/PageContainer";
import { ServerCreateForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewServerPage() {
  await requireAdmin();

  return (
    <PageContainer maxWidth="narrow" className="py-6">
      <Link
        href="/admin/servers"
        className="text-xs font-mono text-text-muted hover:text-brand-yellow inline-flex items-center gap-1 mb-3"
      >
        ← Серверы
      </Link>
      <h1 className="text-xl font-bold tracking-tight mb-1">
        Новый CS2-сервер
      </h1>
      <p className="text-[13px] text-text-secondary mb-5">
        Добавь запись сервера, который физически работает у тебя дома.
        RCON-пароль шифруется AES-GCM через{" "}
        <code className="font-mono text-text-primary">SERVER_ENCRYPTION_KEY</code>{" "}
        и хранится в БД.
      </p>
      <ServerCreateForm />
    </PageContainer>
  );
}
