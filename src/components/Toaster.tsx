"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2 } from "lucide-react";
import type { TrackedEvent } from "@/lib/tracking";

interface ToastItem {
  id: number;
  text: string;
  kind: "ok" | "pixel";
}

let n = 0;

/** Fire a toast from anywhere: toast("Saved"). */
export function toast(text: string) {
  window.dispatchEvent(new CustomEvent("aqarpro:toast", { detail: text }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [pixelOn, setPixelOn] = useState(true);

  useEffect(() => {
    const push = (t: Omit<ToastItem, "id">, ms: number) => {
      const id = ++n;
      setItems((s) => [...s.slice(-3), { ...t, id }]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), ms);
    };
    const onToast = (e: Event) => push({ text: (e as CustomEvent<string>).detail, kind: "ok" }, 3500);
    const onTrack = (e: Event) => {
      if (!pixelOn) return;
      const ev = (e as CustomEvent<TrackedEvent>).detail;
      push({ text: `Pixel + CAPI · ${ev.name} · ${ev.eventId}`, kind: "pixel" }, 2500);
    };
    window.addEventListener("aqarpro:toast", onToast);
    window.addEventListener("aqarpro:track", onTrack);
    return () => {
      window.removeEventListener("aqarpro:toast", onToast);
      window.removeEventListener("aqarpro:track", onTrack);
    };
  }, [pixelOn]);

  return (
    <div className="pointer-events-none fixed bottom-4 start-4 z-[60] flex flex-col gap-2" dir="ltr">
      {items.map((t) =>
        t.kind === "ok" ? (
          <div key={t.id} className="pointer-events-auto flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            {t.text}
          </div>
        ) : (
          <button
            key={t.id}
            onClick={() => setPixelOn(false)}
            title="Click to hide tracking toasts"
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 font-mono text-[11px] text-sky-800 shadow"
          >
            <Activity className="h-3.5 w-3.5" />
            {t.text}
          </button>
        ),
      )}
    </div>
  );
}
