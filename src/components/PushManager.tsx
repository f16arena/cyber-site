"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return buffer;
}

type Status = "loading" | "unsupported" | "denied" | "off" | "on";

export function PushManager() {
  const [status, setStatus] = useState<Status>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setStatus(sub ? "on" : "off");
      })
      .catch(() => setStatus("off"));
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) return;
    setWorking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (res.ok) {
        setStatus("on");
      } else {
        setStatus("off");
      }
    } catch (e) {
      console.error("Push subscribe failed:", e);
      setStatus("off");
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE" }
        );
        await sub.unsubscribe();
      }
      setStatus("off");
    } finally {
      setWorking(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <p className="text-xs font-mono text-zinc-500">
        Push-уведомления не поддерживаются твоим браузером.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400">
        🔕 Уведомления заблокированы. Включи их в настройках браузера для
        этого сайта, чтобы получать push.
      </div>
    );
  }

  if (status === "on") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-emerald-400">
          🔔 Push-уведомления включены
        </span>
        <button
          type="button"
          onClick={disable}
          disabled={working}
          className="text-xs font-mono px-3 h-8 rounded border border-zinc-700 hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-50"
        >
          Отключить
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={working}
      className="text-xs font-mono px-4 h-9 rounded border border-violet-500/30 hover:bg-violet-500/10 text-violet-300 disabled:opacity-50"
    >
      🔔 {working ? "Включаем..." : "Включить push-уведомления"}
    </button>
  );
}
