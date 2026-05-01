"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendMessage } from "../actions";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
};

export function ChatWindow({
  myId,
  otherId,
  initialMessages,
}: {
  myId: string;
  otherId: string;
  initialMessages: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Polling каждые 4 секунды
  useEffect(() => {
    const tick = async () => {
      try {
        const res = await fetch(`/api/messages?with=${otherId}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { messages: Msg[] };
          setMessages(data.messages);
        }
      } catch {
        // ignore network blips
      }
    };
    const interval = setInterval(tick, 6000);
    return () => clearInterval(interval);
  }, [otherId]);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScroll(distanceFromBottom < 100);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: Msg = {
      id: tempId,
      body: body.trim(),
      createdAt: new Date().toISOString(),
      senderId: myId,
    };
    setMessages((m) => [...m, optimistic]);
    const text = body;
    setBody("");

    startTransition(async () => {
      const fd = new FormData();
      fd.set("toUserId", otherId);
      fd.set("body", text.trim());
      await sendMessage(fd);
    });
  }

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="text-center text-sm text-zinc-500 py-8">
            Сообщений пока нет. Напиши первый.
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderId === myId;
            const prev = messages[i - 1];
            const showTime =
              !prev ||
              new Date(m.createdAt).getTime() -
                new Date(prev.createdAt).getTime() >
                1000 * 60 * 5;
            return (
              <div key={m.id}>
                {showTime && (
                  <div className="text-[10px] font-mono text-zinc-600 text-center my-2">
                    {new Date(m.createdAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      mine
                        ? "bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex gap-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Написать сообщение..."
          maxLength={2000}
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded h-10 px-3 text-sm focus:outline-none focus:border-violet-400 transition-colors"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="h-10 px-5 rounded font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Отправить
        </button>
      </form>
    </>
  );
}
