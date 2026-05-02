"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendTeamMessage } from "../../../messages/actions";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};

export function TeamChatWindow({
  myId,
  teamId,
  initialMessages,
}: {
  myId: string;
  teamId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/team-messages?team=${teamId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { messages: Msg[] };
          setMessages(data.messages);
        }
      } catch {}
    };
    const interval = setInterval(tick, 6000);
    return () => clearInterval(interval);
  }, [teamId]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(fromBottom < 100);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const text = body;
    setBody("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("teamId", teamId);
      fd.set("body", text.trim());
      await sendTeamMessage(fd);
    });
  }

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-sm text-zinc-400 py-8">
            Сообщений пока нет. Напиши первый.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender.id === myId;
            return (
              <div
                key={m.id}
                className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}
              >
                <Link
                  href={`/players/${encodeURIComponent(m.sender.username)}`}
                  className="shrink-0"
                >
                  {m.sender.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.sender.avatarUrl}
                      alt={m.sender.username}
                      className="w-8 h-8 rounded border border-zinc-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-violet-500/20" />
                  )}
                </Link>
                <div
                  className={`max-w-[70%] ${mine ? "text-right" : ""}`}
                >
                  <Link
                    href={`/players/${encodeURIComponent(m.sender.username)}`}
                    className="text-[10px] font-mono text-zinc-400 hover:text-violet-300"
                  >
                    {m.sender.username}
                  </Link>
                  <div
                    className={`mt-0.5 rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {m.body}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-600 mt-0.5">
                    {new Date(m.createdAt).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={submit}
        className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex gap-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Написать в командный чат..."
          maxLength={2000}
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded h-10 px-3 text-sm focus:outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="h-10 px-5 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 transition-all"
        >
          Отправить
        </button>
      </form>
    </>
  );
}
