"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BadgeCheck,
  Bot,
  CircleCheck,
  Download,
  ExternalLink,
  Hand,
  Lock,
  Plus,
  RotateCcw,
  Send,
  StickyNote,
  Tag,
  UserRound,
  X,
} from "lucide-react";
import { advertiserById, planById } from "@/lib/data";
import { priceLabel, timeAgo } from "@/lib/format";
import { uid, useStore, type ChatMsg, type Conversation, type Lead } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { toast } from "@/components/Toaster";
import { Badge, btn, Card, cn, input, ReqTag } from "@/components/ui";
import { channelMeta, ChannelIcon, downloadCsv, useNow } from "./channel";

const ME = "Layla (you)";
const AGENTS = [ME, "Omar", "Ravi"];

type Filter = "all" | "unassigned" | "mine" | "bot" | "closed";

const canned = [
  {
    label: { en: "Viewing slots", ar: "مواعيد المعاينة" },
    en: "I can arrange a viewing for you. Would Saturday at 10:00 or 16:00 suit you?",
    ar: "يمكنني ترتيب معاينة لك. هل يناسبك يوم السبت الساعة 10:00 أو 16:00؟",
  },
  {
    label: { en: "Connecting advertiser", ar: "التواصل مع المعلن" },
    en: "Thanks! I'm forwarding your details to the advertiser now — they'll contact you on WhatsApp shortly.",
    ar: "شكراً لك! أقوم الآن بتحويل بياناتك إلى المعلن وسيتواصل معك عبر واتساب قريباً.",
  },
  {
    label: { en: "Documents needed", ar: "المستندات المطلوبة" },
    en: "To reserve, you'll need a copy of your QID, a salary certificate and the first cheque.",
    ar: "للحجز ستحتاج إلى نسخة من البطاقة الشخصية وشهادة راتب والشيك الأول.",
  },
  {
    label: { en: "Still available", ar: "ما زال متاحاً" },
    en: "Good news — this property is still available.",
    ar: "خبر سار — هذا العقار ما زال متاحاً.",
  },
];

function slaInfo(c: Conversation, now: number | null) {
  if (!c.slaDueAt || c.status === "closed" || c.status === "bot" || now === null) return null;
  const diff = new Date(c.slaDueAt).getTime() - now;
  const abs = Math.abs(diff);
  const mm = Math.floor(abs / 60000);
  const ss = Math.floor((abs % 60000) / 1000);
  const text = `${diff < 0 ? "-" : ""}${mm}:${String(ss).padStart(2, "0")}`;
  return { diff, text, tone: diff < 0 ? "red" : diff < 5 * 60000 ? "amber" : "green" } as const;
}

function SlaChip({ c, now }: { c: Conversation; now: number | null }) {
  const s = slaInfo(c, now);
  if (!s) return null;
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums",
        s.tone === "red" && "bg-red-600 text-white",
        s.tone === "amber" && "bg-amber-100 text-amber-800",
        s.tone === "green" && "bg-emerald-50 text-emerald-700",
      )}
      title="SLA"
      dir="ltr"
    >
      SLA {s.text}
    </span>
  );
}

export function Inbox() {
  const { lang, t, p } = useLang();
  const { state, update } = useStore();
  const now = useNow(1000);
  const sp = useSearchParams();
  const [filter, setFilter] = useState<Filter>("all");
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(sp.get("c"));

  const list = useMemo(() => {
    let r = state.conversations;
    if (filter === "unassigned") r = r.filter((c) => c.status !== "closed" && c.status !== "bot" && !c.assignee);
    if (filter === "mine") r = r.filter((c) => c.assignee === ME && c.status !== "closed");
    if (filter === "bot") r = r.filter((c) => c.status === "bot");
    if (filter === "closed") r = r.filter((c) => c.status === "closed");
    if (filter === "all") r = r.filter((c) => c.status !== "closed");
    if (channels.length) r = r.filter((c) => channels.includes(c.channel));
    const rank = (c: Conversation) => (c.status === "open" || c.status === "pending" ? (c.slaDueAt ? new Date(c.slaDueAt).getTime() : Infinity) : Infinity);
    return [...r].sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt));
  }, [state.conversations, filter, channels]);

  const selected = state.conversations.find((c) => c.id === selectedId) ?? list[0];

  const counts = {
    all: state.conversations.filter((c) => c.status !== "closed").length,
    unassigned: state.conversations.filter((c) => c.status !== "closed" && c.status !== "bot" && !c.assignee).length,
    mine: state.conversations.filter((c) => c.assignee === ME && c.status !== "closed").length,
    bot: state.conversations.filter((c) => c.status === "bot").length,
    closed: state.conversations.filter((c) => c.status === "closed").length,
  };

  const patch = (id: string, fn: (c: Conversation) => Conversation) =>
    update((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === id ? fn(c) : c)) }));

  const exportCsv = () =>
    downloadCsv("maxpro-conversations.csv", [
      ["id", "channel", "customer", "phone", "listing", "status", "assignee", "tags", "source", "created", "updated", "messages"],
      ...list.map((c) => [c.id, c.channel, c.customer.name, c.customer.phone, c.listingId, c.status, c.assignee, c.tags.join("|"), c.source, c.createdAt, c.updatedAt, c.messages.length]),
    ]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("All open", "كل المفتوحة") },
    { id: "unassigned", label: t("Unassigned", "غير مسندة") },
    { id: "mine", label: t("Mine", "محادثاتي") },
    { id: "bot", label: t("AI handling", "يتولاها الذكاء") },
    { id: "closed", label: t("Closed", "مغلقة") },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-stone-900">{t("Support inbox", "صندوق الدعم")}</h1>
          <ReqTag id="FR-WAP-07" />
          <ReqTag id="WP-SUP-09" />
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="hidden sm:inline">
            {t("Signed in as", "مسجل الدخول باسم")} <b className="text-stone-800">Layla · {t("Support agent", "موظفة دعم")}</b>
          </span>
          <button onClick={exportCsv} className={cn(btn.secondary, "py-1.5 text-xs")}>
            <Download className="h-3.5 w-3.5" />
            {t("Export CSV", "تصدير CSV")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[290px_1fr] xl:h-[calc(100vh-8.5rem)] xl:grid-cols-[300px_1fr_320px]">
        {/* ---------- Left: list ---------- */}
        <Card className="flex min-h-0 flex-col overflow-hidden md:max-h-[calc(100vh-8.5rem)]">
          <div className="border-b border-stone-100 p-2">
            <div className="flex flex-wrap gap-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-semibold",
                    filter === f.id ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-stone-100",
                  )}
                >
                  {f.label} <span className="opacity-70">{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(Object.keys(channelMeta) as (keyof typeof channelMeta)[]).map((ch) => {
                const on = channels.includes(ch);
                const Icon = channelMeta[ch].icon;
                return (
                  <button
                    key={ch}
                    onClick={() => setChannels((s) => (on ? s.filter((x) => x !== ch) : [...s, ch]))}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      on ? "border-brand-300 bg-brand-50 text-brand-700" : "border-stone-200 text-stone-600 hover:bg-stone-50",
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {p(channelMeta[ch].name)}
                  </button>
                );
              })}
            </div>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-stone-100 overflow-y-auto">
            {list.length === 0 && <li className="p-6 text-center text-sm text-stone-400">{t("No conversations", "لا توجد محادثات")}</li>}
            {list.map((c) => {
              const last = [...c.messages].reverse().find((m) => m.from !== "note" && m.from !== "system") ?? c.messages[c.messages.length - 1];
              const active = selected?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={cn("flex w-full gap-2.5 px-3 py-3 text-start hover:bg-stone-50", active && "bg-brand-50/60 hover:bg-brand-50")}
                  >
                    <ChannelIcon channel={c.channel} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-stone-900">{c.customer.name}</span>
                        <span className="shrink-0 text-[10px] text-stone-400">{now ? timeAgo(c.updatedAt, lang) : ""}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{last?.text}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {c.status === "bot" && (
                          <Badge tone="violet" className="text-[10px]">
                            <Bot className="h-3 w-3" />
                            AI
                          </Badge>
                        )}
                        {c.status === "closed" && <Badge className="text-[10px]">{t("Closed", "مغلقة")}</Badge>}
                        {c.listingId && <span className="font-mono text-[10px] text-stone-500">{c.listingId}</span>}
                        {c.tags.slice(0, 2).map((tg) => (
                          <span key={tg} className="rounded bg-stone-100 px-1 text-[10px] text-stone-600">
                            #{tg}
                          </span>
                        ))}
                        <span className="ms-auto">
                          <SlaChip c={c} now={now} />
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* ---------- Middle: thread ---------- */}
        {selected ? (
          <Thread key={selected.id} c={selected} now={now} patch={patch} />
        ) : (
          <Card className="grid place-items-center p-10 text-sm text-stone-400">{t("Select a conversation", "اختر محادثة")}</Card>
        )}

        {/* ---------- Right: context ---------- */}
        {selected && <ContextPane key={`ctx-${selected.id}`} c={selected} patch={patch} now={now} />}
      </div>
    </div>
  );
}

// ---------------- Thread ----------------
type Patch = (id: string, fn: (c: Conversation) => Conversation) => void;

function Thread({ c, now, patch }: { c: Conversation; now: number | null; patch: Patch }) {
  const { t, p } = useLang();
  const { update, audit } = useStore();
  const [text, setText] = useState("");
  const [note, setNote] = useState(false);

  const sysMsg = (txt: string): ChatMsg => ({ id: uid("m"), from: "system", text: txt, at: new Date().toISOString() });

  const send = () => {
    if (!text.trim()) return;
    const msg: ChatMsg = { id: uid("m"), from: note ? "note" : "agent", text: note ? `${text.trim()} — Layla` : text.trim(), at: new Date().toISOString(), status: note ? undefined : "sent" };
    patch(c.id, (x) => ({
      ...x,
      messages: [...x.messages, msg],
      updatedAt: msg.at,
      assignee: x.assignee ?? ME,
      status: x.status === "closed" ? "open" : x.status === "bot" ? "open" : x.status,
      slaDueAt: note ? x.slaDueAt : undefined,
    }));
    if (!note && c.channel === "whatsapp")
      update((s) => ({
        ...s,
        notifications: [
          { id: uid("N"), at: msg.at, channel: "whatsapp", to: c.customer.phone ?? c.customer.name, template: "session_message (24h window)", status: "sent" },
          ...s.notifications,
        ],
      }));
    setText("");
  };

  const takeOver = () => {
    patch(c.id, (x) => ({
      ...x,
      status: "open",
      assignee: ME,
      slaDueAt: new Date(Date.now() + 15 * 60000).toISOString(),
      messages: [...x.messages, sysMsg("Layla took over from the AI assistant.")],
      updatedAt: new Date().toISOString(),
    }));
    audit({ actor: "Layla (Support)", role: "agent", action: "conversation.takeover", target: c.id, detail: "AI → human" });
    toast(t("You took over from the AI", "توليت المحادثة بدلاً من الذكاء الاصطناعي"));
  };

  const setStatus = (status: Conversation["status"]) => {
    patch(c.id, (x) => ({
      ...x,
      status,
      messages: [...x.messages, sysMsg(status === "closed" ? "Conversation closed by Layla." : "Conversation reopened by Layla.")],
      updatedAt: new Date().toISOString(),
    }));
    audit({ actor: "Layla (Support)", role: "agent", action: `conversation.${status === "closed" ? "closed" : "reopened"}`, target: c.id });
  };

  const insertCanned = (i: number) => {
    const cr = canned[i];
    setText(c.customer.lang === "ar" ? cr.ar : cr.en);
    setNote(false);
  };

  return (
    <Card className="flex min-h-[520px] flex-col overflow-hidden md:max-h-[calc(100vh-8.5rem)]">
      <div className="flex flex-wrap items-center gap-3 border-b border-stone-100 px-4 py-3">
        <ChannelIcon channel={c.channel} className="h-9 w-9" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-stone-900">{c.customer.name}</span>
            <span className="text-[11px] text-stone-400">{c.id}</span>
          </div>
          <div className="text-xs text-stone-500">
            {p(channelMeta[c.channel].name)} · {c.customer.lang === "ar" ? "العربية" : "English"}
            {c.assignee && <> · {t("Assigned to", "مسندة إلى")} {c.assignee}</>}
          </div>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <SlaChip c={c} now={now} />
          {c.status === "closed" ? (
            <button onClick={() => setStatus("open")} className={cn(btn.secondary, "py-1.5 text-xs")}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t("Reopen", "إعادة فتح")}
            </button>
          ) : (
            <button onClick={() => setStatus("closed")} className={cn(btn.secondary, "py-1.5 text-xs")}>
              <CircleCheck className="h-3.5 w-3.5" />
              {t("Close", "إغلاق")}
            </button>
          )}
        </div>
      </div>

      {c.status === "bot" && (
        <div className="flex flex-wrap items-center gap-3 border-b border-violet-100 bg-violet-50 px-4 py-2.5 text-sm text-violet-900">
          <Bot className="h-4 w-4" />
          <span className="flex-1">{t("The AI assistant is handling this conversation. You can take over at any time.", "المساعد الذكي يتولى هذه المحادثة. يمكنك التدخل في أي وقت.")}</span>
          <button onClick={takeOver} className={cn(btn.primary, "py-1.5 text-xs")}>
            <Hand className="h-3.5 w-3.5" />
            {t("Take over from AI", "تولَّ المحادثة")}
          </button>
        </div>
      )}
      {c.handoverReason && c.status !== "bot" && (
        <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <b>{t("AI handover reason:", "سبب التحويل من الذكاء:")}</b> {c.handoverReason} <ReqTag id="WP-SUP-06" className="ms-1" />
          </span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50/60 px-4 py-4">
        {c.messages.map((m) => (
          <MessageRow key={m.id} m={m} now={now} />
        ))}
      </div>

      <div className="border-t border-stone-100 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {canned.map((cr, i) => (
            <button key={i} onClick={() => insertCanned(i)} className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 hover:border-brand-300 hover:text-brand-700">
              {p(cr.label)}
            </button>
          ))}
        </div>
        <div className={cn("rounded-xl border", note ? "border-amber-300 bg-amber-50" : "border-stone-300 bg-white")}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={note ? t("Internal note — only visible to the team", "ملاحظة داخلية — تظهر للفريق فقط") : t(`Reply to ${c.customer.name}…`, `الرد على ${c.customer.name}…`)}
            className="w-full resize-none bg-transparent px-3 py-2 text-sm focus:outline-none"
            dir="auto"
          />
          <div className="flex items-center justify-between border-t border-stone-100 px-2 py-1.5">
            <div className="flex gap-1">
              <button onClick={() => setNote(false)} className={cn("rounded-md px-2 py-1 text-xs font-semibold", !note ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100")}>
                {t("Reply", "رد")}
              </button>
              <button onClick={() => setNote(true)} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold", note ? "bg-amber-400 text-amber-950" : "text-stone-600 hover:bg-stone-100")}>
                <StickyNote className="h-3 w-3" />
                {t("Internal note", "ملاحظة داخلية")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {c.channel === "whatsapp" && !note && (
                <span className="hidden text-[10px] text-stone-400 sm:inline">{t("Within 24h session window", "ضمن نافذة الـ 24 ساعة")}</span>
              )}
              <button onClick={send} disabled={!text.trim()} className={cn(btn.primary, "py-1.5 text-xs")}>
                <Send className="flip-rtl h-3.5 w-3.5" />
                {note ? t("Add note", "أضف ملاحظة") : t("Send", "إرسال")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MessageRow({ m, now }: { m: ChatMsg; now: number | null }) {
  const { lang, t } = useLang();
  const time = now ? timeAgo(m.at, lang) : "";
  if (m.from === "system")
    return (
      <div className="flex justify-center">
        <span className="rounded-full bg-stone-200/70 px-3 py-1 text-[11px] text-stone-600">
          {m.text} {time && <span className="opacity-60">· {time}</span>}
        </span>
      </div>
    );
  if (m.from === "note")
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <div className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          <Lock className="h-3 w-3" />
          {t("Internal note", "ملاحظة داخلية")} {time && <span className="font-normal normal-case opacity-70">· {time}</span>}
        </div>
        <p dir="auto">{m.text}</p>
      </div>
    );
  const mine = m.from !== "user";
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[78%]">
        <div className={cn("mb-0.5 flex items-center gap-1 text-[10px] text-stone-400", mine && "justify-end")}>
          {m.from === "bot" && (
            <>
              <Bot className="h-3 w-3 text-violet-500" />
              {t("AI assistant", "المساعد الذكي")}
            </>
          )}
          {m.from === "agent" && (
            <>
              <UserRound className="h-3 w-3 text-brand-600" />
              Layla
            </>
          )}
          {time && <span>· {time}</span>}
        </div>
        <div
          className={cn(
            "whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm shadow-sm",
            m.from === "user" && "rounded-ss-sm bg-white text-stone-800",
            m.from === "bot" && "rounded-se-sm bg-violet-100 text-violet-950",
            m.from === "agent" && "rounded-se-sm bg-brand-600 text-white",
          )}
          dir="auto"
        >
          {m.text}
          {m.media && (
            <div className="mt-2 grid grid-cols-3 gap-1">
              {m.media.map((md, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md">
                  <Image src={md.src} alt={md.caption} fill sizes="80px" className="object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1 text-[9px] text-white">{md.caption}</span>
                </div>
              ))}
            </div>
          )}
          {m.buttons && (
            <div className="mt-2 flex flex-wrap gap-1">
              {m.buttons.map((b) => (
                <span key={b} className="rounded-full border border-current/20 bg-white/60 px-2 py-0.5 text-[11px]">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
        {m.from === "agent" && m.status && <div className="mt-0.5 text-end text-[10px] text-stone-400">{m.status === "read" ? "✓✓ read" : m.status === "delivered" ? "✓✓" : "✓"}</div>}
      </div>
    </div>
  );
}

// ---------------- Context pane ----------------
function ContextPane({ c, patch, now }: { c: Conversation; patch: Patch; now: number | null }) {
  const { lang, t, p, href } = useLang();
  const { state, update, audit } = useStore();
  const listing = c.listingId ? state.listings.find((l) => l.id === c.listingId) : undefined;
  const adv = listing ? advertiserById(listing.advertiserId) : undefined;
  const plan = adv ? planById(adv.planId) : undefined;
  const defaultRoute: "whatsapp" | "email" | "dashboard" = plan && plan.id !== "starter" ? "whatsapp" : "email";
  const [route, setRoute] = useState<"whatsapp" | "email" | "dashboard">(defaultRoute);
  const [newTag, setNewTag] = useState("");
  const consent = c.customer.phone ? state.consents.find((x) => x.subject === c.customer.phone && x.channel === "whatsapp") : undefined;
  const routed = c.tags.includes("lead-routed");

  const assign = (who: string) => {
    patch(c.id, (x) => ({ ...x, assignee: who || undefined }));
    audit({ actor: "Layla (Support)", role: "agent", action: "conversation.assigned", target: c.id, detail: who || "unassigned" });
  };

  const addTag = () => {
    const tg = newTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tg) return;
    patch(c.id, (x) => ({ ...x, tags: x.tags.includes(tg) ? x.tags : [...x.tags, tg] }));
    setNewTag("");
  };

  const routeLead = () => {
    if (!listing || !adv) return;
    const lastUser = [...c.messages].reverse().find((m) => m.from === "user");
    const at = new Date().toISOString();
    const lead: Lead = {
      id: uid("L"),
      listingId: listing.id,
      advertiserId: adv.id,
      name: c.customer.name,
      phone: c.customer.phone,
      channel: c.channel,
      message: lastUser?.text ?? "",
      createdAt: at,
      status: "new",
      score: Math.min(95, 55 + c.messages.length * 5 + (c.tags.includes("hot") ? 10 : 0)),
      source: c.source,
    };
    update((s) => ({
      ...s,
      leads: [lead, ...s.leads],
      notifications: [
        {
          id: uid("N"),
          at,
          channel: route === "whatsapp" ? "whatsapp" : route === "email" ? "email" : "inapp",
          to: route === "whatsapp" ? adv.phone : route === "email" ? `leads@${adv.id.replace("adv-", "")}.qa` : p(adv.name),
          template: "lead_forwarded",
          status: "sent",
        },
        ...s.notifications,
      ],
      conversations: s.conversations.map((x) => (x.id === c.id ? { ...x, tags: x.tags.includes("lead-routed") ? x.tags : [...x.tags, "lead-routed"] } : x)),
    }));
    audit({ actor: "Layla (Support)", role: "agent", action: "lead.routed", target: lead.id, detail: `listing=${listing.id}; advertiser=${adv.id}; via=${route}` });
    toast(t(`Lead sent to ${adv.name.en} via ${route}`, `تم إرسال العميل إلى ${adv.name.ar}`));
  };

  return (
    <div className="space-y-3 md:col-span-2 xl:col-span-1 xl:overflow-y-auto">
      <Card className="p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{t("Customer", "العميل")}</div>
        <div className="mt-2 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-sm font-bold text-stone-600">{c.customer.name.slice(0, 1)}</span>
          <div>
            <div className="font-semibold text-stone-900">{c.customer.name}</div>
            <div className="text-xs text-stone-500" dir="ltr">
              {c.customer.phone ?? t("Anonymous visitor", "زائر مجهول")}
            </div>
          </div>
        </div>
        <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-stone-500">{t("Source", "المصدر")}</dt>
            <dd className="text-end font-medium text-stone-800">{c.source ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-stone-500">{t("WhatsApp consent", "موافقة واتساب")}</dt>
            <dd>
              {consent ? (
                <Badge tone={consent.optedIn ? "green" : "red"}>
                  {consent.optedIn ? t("Opted in", "موافق") : t("Opted out", "ألغى الاشتراك")} · {now ? timeAgo(consent.at, lang) : ""}
                </Badge>
              ) : (
                <Badge>{t("Not recorded", "غير مسجلة")}</Badge>
              )}
            </dd>
          </div>
          {consent && <div className="text-[10px] text-stone-400">{t("Captured via", "سُجلت عبر")}: {consent.via}</div>}
        </dl>
      </Card>

      {listing && adv && (
        <Card className="overflow-hidden">
          <div className="relative aspect-[16/9]">
            <Image src={listing.media[0].src} alt={p(listing.title)} fill sizes="320px" className="object-cover" />
            <span className="absolute start-2 top-2 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[10px] font-bold">{listing.id}</span>
          </div>
          <div className="p-4">
            <div className="font-bold text-stone-900">{priceLabel(listing.price, listing.purpose, lang)}</div>
            <div className="mt-0.5 line-clamp-2 text-sm text-stone-700">{p(listing.title)}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-600">
              <span className="grid h-5 w-5 place-items-center rounded-full text-[8px] font-bold text-white" style={{ background: adv.color }}>
                {adv.initials}
              </span>
              {p(adv.name)}
              {adv.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-600" />}
              {plan && <Badge className="ms-auto text-[10px]">{p(plan.name)}</Badge>}
            </div>
            <Link href={href(`/listing/${listing.id}`)} target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              {t("Open listing", "فتح الإعلان")}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      )}

      {listing && adv && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-stone-900">{t("Route lead to advertiser", "تحويل العميل إلى المعلن")}</div>
            <ReqTag id="FR-WAP-08" />
          </div>
          <p className="mt-1 text-xs text-stone-500">
            {t(`Plan rule (${plan?.name.en}): `, `قاعدة الباقة (${plan?.name.ar}): `)}
            {plan?.id === "starter" ? t("email only", "البريد فقط") : t("WhatsApp, email or dashboard", "واتساب أو البريد أو اللوحة")}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {(["whatsapp", "email", "dashboard"] as const).map((r) => {
              const disabled = plan?.id === "starter" && r !== "email";
              return (
                <button
                  key={r}
                  disabled={disabled}
                  onClick={() => setRoute(r)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-semibold capitalize disabled:opacity-40",
                    route === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-200 text-stone-600 hover:bg-stone-50",
                  )}
                >
                  {r === "whatsapp" ? "WhatsApp" : r === "email" ? t("Email", "البريد") : t("Dashboard", "اللوحة")}
                </button>
              );
            })}
          </div>
          <button onClick={routeLead} className={cn(btn.primary, "mt-3 w-full py-2 text-xs")}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
            {routed ? t("Route again", "تحويل مرة أخرى") : t("Send lead", "إرسال العميل")}
          </button>
          {routed && <p className="mt-2 text-center text-[11px] text-emerald-700">✓ {t("Lead already routed", "تم تحويل العميل")}</p>}
        </Card>
      )}

      <Card className="p-4">
        <label className="text-sm font-semibold text-stone-900">{t("Assignee", "المسؤول")}</label>
        <select value={c.assignee ?? ""} onChange={(e) => assign(e.target.value)} className={cn(input, "mt-2 py-2")}>
          <option value="">{t("Unassigned", "غير مسندة")}</option>
          {AGENTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-stone-900">
          <Tag className="h-3.5 w-3.5" />
          {t("Tags", "الوسوم")}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {c.tags.map((tg) => (
            <span key={tg} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
              #{tg}
              <button onClick={() => patch(c.id, (x) => ({ ...x, tags: x.tags.filter((y) => y !== tg) }))} aria-label="remove">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-1">
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder={t("Add tag", "أضف وسماً")} className={cn(input, "py-1.5 text-xs")} />
          <button onClick={addTag} className={cn(btn.secondary, "px-2.5 py-1.5")}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
