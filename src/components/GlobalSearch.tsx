"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SearchResults = {
  players: Array<{ username: string; avatarUrl: string | null }>;
  teams: Array<{ name: string; tag: string; game: string }>;
  tournaments: Array<{ name: string; slug: string; game: string; status: string }>;
};

const empty: SearchResults = { players: [], teams: [], tournaments: [] };

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults>(empty);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(empty);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          setResults(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        const input = containerRef.current?.querySelector("input");
        input?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const total =
    results.players.length + results.teams.length + results.tournaments.length;

  return (
    <div ref={containerRef} className="relative hidden md:block w-64">
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Поиск... (Ctrl+K)"
        className="w-full bg-zinc-900/60 border border-zinc-800 rounded h-9 pl-9 pr-3 text-sm font-mono focus:outline-none focus:border-violet-400/60 transition-colors"
      />
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
        🔍
      </span>

      {open && q.length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-lg border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {loading && (
            <div className="p-4 text-xs font-mono text-zinc-500">Поиск...</div>
          )}
          {!loading && total === 0 && (
            <div className="p-4 text-xs font-mono text-zinc-500">
              Ничего не найдено
            </div>
          )}
          {!loading && results.players.length > 0 && (
            <Section title="Игроки">
              {results.players.map((p) => (
                <Link
                  key={p.username}
                  href={`/players/${p.username}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-violet-500/10 text-sm"
                >
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatarUrl}
                      alt={p.username}
                      className="w-6 h-6 rounded"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-violet-500/20" />
                  )}
                  <span>{p.username}</span>
                </Link>
              ))}
            </Section>
          )}
          {!loading && results.teams.length > 0 && (
            <Section title="Команды">
              {results.teams.map((t) => (
                <Link
                  key={t.tag}
                  href={`/teams/${t.tag}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-violet-500/10 text-sm"
                >
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-zinc-900/40 border-zinc-700">
                    {t.game}
                  </span>
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs font-mono text-zinc-500">[{t.tag}]</span>
                </Link>
              ))}
            </Section>
          )}
          {!loading && results.tournaments.length > 0 && (
            <Section title="Турниры">
              {results.tournaments.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tournaments/${t.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-violet-500/10 text-sm"
                >
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-zinc-900/40 border-zinc-700">
                    {t.game}
                  </span>
                  <span className="font-medium">{t.name}</span>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-800/50 last:border-b-0">
      <div className="px-3 py-1.5 text-[9px] font-mono uppercase tracking-widest text-violet-400 bg-zinc-900/50">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
