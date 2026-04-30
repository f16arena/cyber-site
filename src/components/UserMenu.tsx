import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Link
        href="/api/auth/steam"
        className="text-sm px-4 h-9 inline-flex items-center font-medium rounded border border-violet-500/30 hover:border-violet-400 hover:bg-violet-500/10 transition-all"
      >
        Войти через Steam
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/profile`}
        className="flex items-center gap-2 group"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.username || "avatar"}
            className="w-8 h-8 rounded border border-violet-500/30 group-hover:border-violet-400 transition-colors"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-violet-500/20 border border-violet-500/30" />
        )}
        <span className="text-sm font-medium hidden sm:inline group-hover:text-violet-300 transition-colors">
          {user.username}
        </span>
      </Link>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="text-xs font-mono text-zinc-500 hover:text-rose-300 transition-colors"
          title="Выйти"
        >
          ✕
        </button>
      </form>
    </div>
  );
}
