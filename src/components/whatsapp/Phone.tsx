"use client";

import Image from "next/image";
import { ArrowLeft, BadgeCheck, Check, CheckCheck, List, MapPin, MoreVertical, Phone as PhoneIcon, Reply, Send, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../ui";

export interface WaMsg {
  id: string;
  from: "user" | "bot" | "agent" | "system";
  kind: "text" | "media" | "location" | "list" | "template";
  text?: string;
  media?: { src: string; caption: string };
  location?: { name: string; address: string; lat: number; lng: number };
  buttons?: string[];
  list?: { button: string; title: string; rows: { id: string; title: string; desc?: string }[] };
  template?: { name: string; header: string; body: string; footer: string; buttons: string[] };
  at: number;
  status?: "sent" | "delivered" | "read";
  agentName?: string;
}

const hhmm = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Ticks({ s }: { s?: WaMsg["status"] }) {
  if (!s) return null;
  if (s === "sent") return <Check className="h-3.5 w-3.5 text-stone-400" />;
  return <CheckCheck className={cn("h-3.5 w-3.5", s === "read" ? "text-sky-500" : "text-stone-400")} />;
}

export function Phone({
  msgs,
  typing,
  dir,
  onSend,
  onTap,
  labels,
}: {
  msgs: WaMsg[];
  typing: boolean;
  dir: "ltr" | "rtl";
  onSend: (text: string) => void;
  onTap: (text: string) => void;
  labels: { typing: string; business: string; placeholder: string; today: string; openMap: string };
}) {
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<WaMsg["list"] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing]);

  return (
    <div className="relative mx-auto h-[740px] w-[370px] shrink-0 rounded-[3rem] border-[11px] border-stone-900 bg-stone-900 shadow-2xl">
      <div className="absolute start-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-stone-900 rtl:translate-x-1/2" />
      <div dir={dir} className="relative flex h-full flex-col overflow-hidden rounded-[2.2rem] bg-wa-chat">
        {/* Header */}
        <div className="flex items-center gap-2 bg-[#008069] px-3 pb-2.5 pt-7 text-white">
          <ArrowLeft className="flip-rtl h-5 w-5" />
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white">
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
              <rect width="32" height="32" rx="8" fill="#8a1538" />
              <path d="M7 23V11l5 6 4-6 4 6 5-6v12" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1 text-[15px] font-semibold">
              MaxPro <BadgeCheck className="h-4 w-4 fill-[#25d366] text-[#008069]" />
            </div>
            <div className="truncate text-[11px] text-white/80">{typing ? labels.typing : labels.business}</div>
          </div>
          <Video className="h-5 w-5" />
          <PhoneIcon className="h-4.5 w-4.5" />
          <MoreVertical className="h-5 w-5" />
        </div>

        {/* Chat */}
        <div className="flex-1 space-y-1.5 overflow-y-auto px-2.5 py-3 text-[13.5px]" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)", backgroundSize: "14px 14px" }}>
          <div className="mx-auto mb-2 w-fit rounded-md bg-white/90 px-2 py-0.5 text-[11px] text-stone-500 shadow-sm">{labels.today}</div>
          {msgs.map((m) => {
            if (m.from === "system")
              return (
                <div key={m.id} className="mx-auto my-1.5 w-fit max-w-[90%] rounded-md bg-[#fff5c4] px-2.5 py-1 text-center text-[11px] text-stone-700 shadow-sm">
                  {m.text}
                </div>
              );
            const mine = m.from === "user";
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <div className={cn("relative max-w-[82%] rounded-lg px-2 pb-1 pt-1.5 shadow-sm", mine ? "rounded-se-none bg-[#d9fdd3]" : "rounded-ss-none bg-white")}>
                  {m.from === "agent" && <div className="mb-0.5 text-[11px] font-semibold text-[#008069]">{m.agentName}</div>}
                  {m.kind === "template" && m.template && (
                    <div className="mb-1">
                      <div className="font-semibold text-stone-900">{m.template.header}</div>
                      <div className="mt-1 whitespace-pre-line text-stone-800">{m.template.body}</div>
                      <div className="mt-1 text-[11px] text-stone-400">{m.template.footer}</div>
                    </div>
                  )}
                  {m.kind === "media" && m.media && (
                    <div className="-mx-1 -mt-0.5 mb-1 overflow-hidden rounded-md">
                      <div className="relative h-44 w-60 bg-stone-200">
                        <Image src={m.media.src} alt={m.media.caption} fill sizes="240px" className="object-cover" />
                      </div>
                    </div>
                  )}
                  {m.kind === "location" && m.location && (
                    <a href={`https://maps.google.com/?q=${m.location.lat},${m.location.lng}`} target="_blank" rel="noreferrer" className="-mx-1 -mt-0.5 mb-1 block overflow-hidden rounded-md">
                      <div className="relative grid h-28 w-60 place-items-center bg-[linear-gradient(135deg,#e7eef0_25%,#dfe8dd_25%,#dfe8dd_50%,#e7eef0_50%,#e7eef0_75%,#dfe8dd_75%)] bg-[length:28px_28px]">
                        <MapPin className="h-9 w-9 fill-red-500 text-red-700 drop-shadow" />
                      </div>
                      <div className="bg-stone-50 px-2 py-1.5">
                        <div className="text-[13px] font-semibold text-stone-900">{m.location.name}</div>
                        <div className="text-[11px] text-stone-500">{m.location.address}</div>
                        <div className="text-[11px] font-medium text-[#008069]">{labels.openMap}</div>
                      </div>
                    </a>
                  )}
                  {m.text && m.kind !== "template" && <div className="whitespace-pre-line pe-12 text-stone-900">{m.text}</div>}
                  {m.media?.caption && <div className="pe-12 text-stone-900">{m.media.caption}</div>}
                  <div className="absolute bottom-0.5 end-1.5 flex items-center gap-0.5 text-[10px] text-stone-500">
                    {hhmm(m.at)}
                    {mine && <Ticks s={m.status} />}
                  </div>
                </div>
                {/* Interactive reply buttons (max 3 per WhatsApp rules) */}
                {(m.buttons?.length || m.template?.buttons.length) && (
                  <div className="mt-0.5 flex w-[82%] max-w-[82%] flex-col gap-0.5">
                    {(m.template?.buttons ?? m.buttons ?? []).slice(0, 3).map((b) => (
                      <button key={b} onClick={() => onTap(b)} className="flex items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[13px] font-medium text-[#008069] shadow-sm hover:bg-stone-50">
                        <Reply className="h-3.5 w-3.5" />
                        {b}
                      </button>
                    ))}
                  </div>
                )}
                {m.list && (
                  <button onClick={() => setSheet(m.list!)} className="mt-0.5 flex w-[82%] items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[13px] font-medium text-[#008069] shadow-sm hover:bg-stone-50">
                    <List className="h-4 w-4" />
                    {m.list.button}
                  </button>
                )}
              </div>
            );
          })}
          {typing && (
            <div className="flex w-fit gap-1 rounded-lg rounded-ss-none bg-white px-3 py-2.5 shadow-sm">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onSend(text.trim());
            setText("");
          }}
          className="flex items-center gap-1.5 px-2 pb-4 pt-1.5"
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={labels.placeholder} className="h-10 flex-1 rounded-full bg-white px-4 text-[14px] shadow-sm outline-none" />
          <button type="submit" className="grid h-10 w-10 place-items-center rounded-full bg-[#00a884] text-white">
            <Send className="flip-rtl h-4 w-4" />
          </button>
        </form>

        {/* List-menu bottom sheet */}
        {sheet && (
          <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onClick={() => setSheet(null)}>
            <div className="rounded-t-2xl bg-white pb-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
                <button onClick={() => setSheet(null)}>
                  <X className="h-5 w-5 text-stone-500" />
                </button>
                <div className="flex-1 text-center text-[15px] font-semibold">{sheet.title}</div>
              </div>
              {sheet.rows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSheet(null);
                    onTap(r.title);
                  }}
                  className="block w-full border-b border-stone-50 px-5 py-2.5 text-start hover:bg-stone-50"
                >
                  <div className="text-[14px] text-stone-900">{r.title}</div>
                  {r.desc && <div className="text-[12px] text-stone-500">{r.desc}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
