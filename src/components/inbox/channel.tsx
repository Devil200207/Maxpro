"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Bot, Globe, Megaphone, MessageCircle, Network } from "lucide-react";
import type { Bi } from "@/lib/i18n";
import type { Channel } from "@/lib/store";
import { cn } from "../ui";

export const channelMeta: Record<Channel, { name: Bi; icon: typeof Bot; cls: string }> = {
  whatsapp: { name: { en: "WhatsApp", ar: "واتساب" }, icon: MessageCircle, cls: "bg-wa-500/10 text-wa-700" },
  web: { name: { en: "Web enquiry", ar: "استفسار الموقع" }, icon: Globe, cls: "bg-sky-50 text-sky-700" },
  ai: { name: { en: "AI chat", ar: "المحادثة الذكية" }, icon: Bot, cls: "bg-violet-50 text-violet-700" },
  meta: { name: { en: "Meta lead", ar: "عميل ميتا" }, icon: Megaphone, cls: "bg-blue-50 text-blue-700" },
  portal: { name: { en: "Portal lead", ar: "عميل من بوابة" }, icon: Network, cls: "bg-amber-50 text-amber-700" },
};

export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  const m = channelMeta[channel];
  const Icon = m.icon;
  return (
    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", m.cls, className)}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

interface Clock {
  value: number;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setInterval>;
}
const clocks = new Map<number, Clock>();

function clock(ms: number) {
  let c = clocks.get(ms);
  if (!c) {
    c = { value: Date.now(), listeners: new Set() };
    clocks.set(ms, c);
  }
  return c;
}

/** Current time, only after mount (server snapshot is null, so no hydration mismatch). Ticks every `ms`. */
export function useNow(ms = 1000): number | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      const c = clock(ms);
      c.listeners.add(cb);
      if (!c.timer) {
        c.value = Date.now();
        c.timer = setInterval(() => {
          c.value = Date.now();
          c.listeners.forEach((l) => l());
        }, ms);
      }
      return () => {
        c.listeners.delete(cb);
        if (!c.listeners.size && c.timer) {
          clearInterval(c.timer);
          c.timer = undefined;
        }
      };
    },
    [ms],
  );
  return useSyncExternalStore(
    subscribe,
    () => clock(ms).value,
    () => null,
  );
}

export function downloadCsv(filename: string, rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
