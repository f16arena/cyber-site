"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_ICON: Record<string, string> = {
  FRIEND_REQUEST: "👥",
  FRIEND_ACCEPTED: "✓",
  TEAM_INVITE: "🛡",
  TEAM_KICKED: "✗",
  MATCH_REMINDER: "⚔",
  MATCH_RESULT: "🏆",
  MVP_AWARDED: "⭐",
  TOURNAMENT_REGISTERED: "🏆",
  NEW_MESSAGE: "💬",
  SPONSOR_INQUIRY: "📩",
  SYSTEM: "ℹ",
};

function formatRelative(date: Date) {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "сейчас";
  if (diff < 3600) return `${Math.floor(diff / 60)}м`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}д`;
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Notif[]; unread: number };
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000); // poll каждые 30 сек
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications?action=read-all", { method: "POST" });
    fetchData();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative text-zinc-400 hover:text-violet-300 transition-colors px-2 h-9 inline-flex items-center"
        title="Уведомления"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold bg-rose-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-80 max-h-[480px] rounded-lg border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-400">
              Уведомления
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] font-mono text-zinc-400 hover:text-violet-300"
              >
                Прочитать всё
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-zinc-500">
                Уведомлений нет
              </div>
            ) : (
              items.map((n) => {
                const isUnread = !n.readAt;
                const Wrapper: React.ElementType = n.link ? Link : "div";
                const props = n.link ? { href: n.link } : {};
                return (
                  <Wrapper
                    {...props}
                    key={n.id}
                    onClick={() => setOpen(false)}
                    className={`flex gap-3 p-3 border-b border-zinc-800/40 last:border-b-0 hover:bg-zinc-900/60 transition-colors text-sm ${
                      isUnread ? "bg-violet-500/5" : ""
                    }`}
                  >
                    <div className="text-2xl shrink-0">
                      {TYPE_ICON[n.type] ?? "ℹ"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-zinc-100 truncate">
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-zinc-500 mt-1">
                        {formatRelative(new Date(n.createdAt))}
                      </div>
                    </div>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0 mt-2" />
                    )}
                  </Wrapper>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
