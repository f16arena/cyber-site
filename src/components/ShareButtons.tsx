"use client";

import { useState } from "react";

const SITE_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_SITE_URL || ""
    : "";

export function ShareButtons({
  path,
  title,
  text,
}: {
  path: string;
  title: string;
  text?: string;
}) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${path}`
      : `${SITE_URL}${path}`;

  const shareText = text || title;
  const enc = encodeURIComponent;
  const tgUrl = `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`;
  const waUrl = `https://api.whatsapp.com/send?text=${enc(`${shareText} ${url}`)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text: shareText, url });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={tgUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-xs font-mono uppercase tracking-wider border border-zinc-700 hover:border-sky-400 hover:text-sky-300 transition-colors"
        title="Поделиться в Telegram"
      >
        <span aria-hidden>📨</span>Telegram
      </a>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-xs font-mono uppercase tracking-wider border border-zinc-700 hover:border-emerald-400 hover:text-emerald-300 transition-colors"
        title="Поделиться в WhatsApp"
      >
        <span aria-hidden>💬</span>WhatsApp
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-xs font-mono uppercase tracking-wider border border-zinc-700 hover:border-violet-400 hover:text-violet-300 transition-colors"
      >
        <span aria-hidden>{copied ? "✓" : "🔗"}</span>
        {copied ? "Скопировано" : "Ссылка"}
      </button>
      <button
        type="button"
        onClick={nativeShare}
        className="sm:hidden inline-flex items-center gap-1.5 h-8 px-3 rounded text-xs font-mono uppercase tracking-wider border border-violet-500/40 text-violet-200"
      >
        Поделиться
      </button>
    </div>
  );
}
