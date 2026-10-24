"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Bot, Headset, Loader2, Mic, Send, Sparkles, ThumbsDown, ThumbsUp, UserRound, X } from "lucide-react";
import { advertiserById } from "@/lib/data";
import { priceLabel } from "@/lib/format";
import { uid, useStore, type ChatMsg, type Conversation, type Lead } from "@/lib/store";
import { track } from "@/lib/tracking";
import { useLang } from "@/lib/useLang";
import type { AssistantResult } from "@/lib/assistant/types";
import { toast } from "./Toaster";
import { btn, cn, input } from "./ui";

interface WMsg {
  id: string;
  role: "user" | "bot" | "system";
  text: string;
  voice?: boolean;
  listings?: string[];
  kb?: { title: string; url: string }[];
  rating?: "up" | "down";
  lead?: "offer" | "form" | "done";
  removed?: string[];
}

const VOICE = {
  en: "I need a villa for my family in Al Waab, around twenty five thousand a month, with a pool if possible",
  ar: "أبحث عن فيلا لعائلتي في الوعب بحدود 25 ألف شهرياً ويفضل مع مسبح",
};

export function AssistantWidget() {
  const { lang, t, href } = useLang();
  const pathname = usePathname();
  const { state, update } = useStore();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<WMsg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [engine, setEngine] = useState<string>("—");
  const [handedOver, setHandedOver] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", consent: false });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  if (pathname?.includes("/whatsapp")) return null;

  const listingById = (id: string) => state.listings.find((l) => l.id === id);

  const history = (list: WMsg[]) =>
    list.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.text }));

  function handover(reason: string, transcript: WMsg[]) {
    const now = new Date();
    const id = uid("C");
    const messages: ChatMsg[] = transcript.map((m) => ({
      id: m.id,
      from: m.role === "user" ? "user" : m.role === "bot" ? "bot" : "system",
      text: m.text,
      at: now.toISOString(),
      listingIds: m.listings,
    }));
    messages.push({ id: uid("m"), from: "system", text: `AI handed over to a human agent: ${reason}`, at: now.toISOString() });
    const conv: Conversation = {
      id,
      channel: "ai",
      customer: { name: leadForm.name || t("Web visitor", "زائر الموقع"), phone: leadForm.phone || undefined, lang },
      listingId: transcript.flatMap((m) => m.listings ?? [])[0],
      status: "open",
      tags: ["ai-handover"],
      messages,
      slaDueAt: new Date(now.getTime() + 15 * 60000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      handoverReason: reason,
      source: "AI assistant (web)",
    };
    update((s) => ({
      ...s,
      conversations: [conv, ...s.conversations],
      audit: [{ id: uid("A"), at: now.toISOString(), actor: "AI Support Agent", role: "ai", action: "conversation.handover", target: id, detail: reason }, ...s.audit],
    }));
    setHandedOver(id);
    track("Contact", { channel: "ai_handover" });
    setMsgs((m) => [
      ...m,
      {
        id: uid("w"),
        role: "system",
        text: t(
          `You're now in the support queue (ref ${id}). A MaxPro agent will reply here — typical response under 10 minutes.`,
          `أنت الآن في قائمة الدعم (مرجع ${id}). سيرد عليك أحد موظفي ماكس برو هنا — عادة خلال أقل من 10 دقائق.`,
        ),
      },
    ]);
  }

  async function send(raw: string, voice = false) {
    const content = raw.trim();
    if (!content || busy) return;
    const userMsg: WMsg = { id: uid("w"), role: "user", text: content, voice };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setText("");
    if (handedOver) {
      // After handover the human agent owns the thread; messages go to the inbox.
      const now = new Date().toISOString();
      update((s) => ({
        ...s,
        conversations: s.conversations.map((c) =>
          c.id === handedOver ? { ...c, updatedAt: now, messages: [...c.messages, { id: userMsg.id, from: "user", text: content, at: now }] } : c,
        ),
      }));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history(next), lang, channel: "web" }),
      });
      if (res.status === 429) throw new Error(t("Too many messages — please wait a minute.", "رسائل كثيرة — انتظر دقيقة من فضلك."));
      if (!res.ok) throw new Error(t("The assistant is unavailable right now.", "المساعد غير متاح حالياً."));
      const data = (await res.json()) as AssistantResult;
      setEngine(data.engine);
      const bot: WMsg = {
        id: uid("w"),
        role: "bot",
        text: data.reply,
        listings: data.listings,
        kb: data.kb,
        lead: data.listings.length ? "offer" : undefined,
        removed: data.validation?.removed,
      };
      const withBot = [...next, bot];
      setMsgs(withBot);
      if (data.handover) handover(data.handover.reason, withBot);
    } catch (e) {
      setMsgs((m) => [...m, { id: uid("w"), role: "system", text: e instanceof Error ? e.message : "Error" }]);
    } finally {
      setBusy(false);
    }
  }

  function voiceNote() {
    setRecording(true);
    setTimeout(() => {
      setRecording(false);
      send(VOICE[lang], true);
    }, 1600);
  }

  function submitLead(msgId: string, listingIds: string[]) {
    const l = listingById(listingIds[0]);
    if (!l || !leadForm.name || !leadForm.phone || !leadForm.consent) return;
    const userTurns = msgs.filter((m) => m.role === "user").length;
    // Simple lead-quality heuristic (WP-SUP-05): engagement + reachable phone + breadth of interest.
    const score = Math.min(97, 50 + userTurns * 8 + (leadForm.phone.replace(/\D/g, "").length >= 8 ? 12 : 0) + (listingIds.length > 1 ? 5 : 0));
    const now = new Date().toISOString();
    const lead: Lead = {
      id: uid("L"),
      listingId: l.id,
      advertiserId: l.advertiserId,
      name: leadForm.name,
      phone: leadForm.phone,
      channel: "ai",
      message: `AI assistant shortlist: ${listingIds.join(", ")}. ${msgs
        .filter((m) => m.role === "user")
        .map((m) => m.text)
        .join(" / ")
        .slice(0, 200)}`,
      createdAt: now,
      status: "new",
      score,
      source: "AI assistant (web)",
    };
    const adv = advertiserById(l.advertiserId);
    update((s) => ({
      ...s,
      leads: [lead, ...s.leads],
      consents: [{ id: uid("CS"), subject: leadForm.phone, channel: "whatsapp", optedIn: true, at: now, via: "AI assistant lead form" }, ...s.consents],
      notifications: [{ id: uid("N"), at: now, channel: "whatsapp", to: adv.phone, template: "new_lead_routed", status: "sent" }, ...s.notifications],
      audit: [{ id: uid("A"), at: now, actor: "AI Support Agent", role: "ai", action: "lead.created", target: lead.id, detail: `listing=${l.id} score=${score}` }, ...s.audit],
    }));
    track("Lead", { listing_id: l.id, source: "ai_assistant" });
    setMsgs((m) => m.map((x) => (x.id === msgId ? { ...x, lead: "done" } : x)));
    toast(t(`Lead sent to ${adv.name.en}`, `تم إرسال طلبك إلى ${adv.name.ar}`));
  }

  const chips = [
    { label: "2 bed in The Pearl under 13k", lang: "en" },
    { label: "فيلا للإيجار في الوعب", lang: "ar" },
    { label: "How much is the Agency plan?", lang: "en" },
    { label: t("Talk to a person", "أريد التحدث مع موظف"), lang },
  ];

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("Ask MaxPro AI", "اسأل مساعد ماكس برو")}
          className="fixed bottom-24 end-4 z-50 flex items-center gap-2 rounded-full bg-brand-600 p-3.5 text-sm font-semibold text-white shadow-xl ring-4 ring-brand-600/15 transition hover:bg-brand-700 lg:bottom-5 lg:end-5 lg:py-3 lg:pe-5 lg:ps-4"
        >
          <Sparkles className="h-5 w-5 text-gold-400" />
          <span className="max-lg:hidden">{t("Ask MaxPro AI", "اسأل مساعد ماكس برو")}</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-0 end-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:bottom-5 sm:end-5 sm:h-[640px] sm:max-h-[calc(100dvh-2.5rem)] sm:w-[400px] sm:rounded-2xl sm:border sm:border-stone-200">
          <div className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t("MaxPro Assistant", "مساعد ماكس برو")}</div>
              <div className="truncate text-xs text-white/75">
                {handedOver ? t("Human agent joining…", "موظف الدعم ينضم…") : t("Finds homes from live listings · العربية / English", "يبحث في الإعلانات المنشورة · العربية / English")}
              </div>
            </div>
            {!handedOver && (
              <button
                onClick={() => handover("User pressed 'Talk to a human'", msgs)}
                className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-medium hover:bg-white/25"
                title={t("Talk to a human", "تحدث مع موظف")}
              >
                <Headset className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Human", "موظف")}</span>
              </button>
            )}
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label={t("Close", "إغلاق")}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50 p-4">
            <div className="max-w-[85%] rounded-2xl rounded-ss-sm bg-white p-3 text-sm text-stone-800 shadow-sm">
              {t(
                "Hi! Tell me what you're looking for — area, budget, bedrooms — and I'll shortlist live listings. You can also ask about plans, or talk to a person any time.",
                "مرحباً! أخبرني بما تبحث عنه — المنطقة والميزانية وعدد الغرف — وسأقترح عليك إعلانات منشورة. يمكنك أيضاً السؤال عن الباقات أو التحدث مع موظف في أي وقت.",
              )}
            </div>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button
                    key={c.label}
                    dir={c.lang === "ar" ? "rtl" : "ltr"}
                    onClick={() => send(c.label)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {msgs.map((m) =>
              m.role === "system" ? (
                <div key={m.id} className="mx-auto max-w-[90%] rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                  {m.text}
                </div>
              ) : m.role === "user" ? (
                <div key={m.id} className="ms-auto max-w-[85%] rounded-2xl rounded-se-sm bg-brand-600 p-3 text-sm text-white">
                  {m.voice && (
                    <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-white/75">
                      <Mic className="h-3 w-3" />
                      {t("Transcribed voice note", "رسالة صوتية مفرّغة")}
                    </div>
                  )}
                  <span className="whitespace-pre-line">{m.text}</span>
                </div>
              ) : (
                <div key={m.id} className="max-w-[92%] space-y-2">
                  <div className="rounded-2xl rounded-ss-sm bg-white p-3 text-sm text-stone-800 shadow-sm">
                    <span className="whitespace-pre-line">{m.text}</span>
                    {!!m.removed?.length && (
                      <div className="mt-2 text-[11px] text-amber-700">
                        {t(`Validation removed ${m.removed.length} unverified reference(s)`, `أزال التحقق ${m.removed.length} مرجعاً غير موثق`)}
                      </div>
                    )}
                    {m.kb?.map((k) => (
                      <Link key={k.url} href={k.url} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline">
                        <BookOpen className="h-3.5 w-3.5" />
                        {t("Source", "المصدر")}: {k.title}
                      </Link>
                    ))}
                  </div>

                  {m.listings?.map((id) => {
                    const l = listingById(id);
                    if (!l) return null;
                    return (
                      <Link key={id} href={href(`/listing/${id}`)} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-2 shadow-sm hover:border-brand-300">
                        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                          <Image src={l.media[0].src} alt="" fill sizes="80px" className="object-cover" />
                        </div>
                        <div className="min-w-0 text-xs">
                          <div className="font-bold text-stone-900">{priceLabel(l.price, l.purpose, lang)}</div>
                          <div className="line-clamp-2 text-stone-600">{l.title[lang]}</div>
                          <div className="font-mono text-[10px] text-stone-400">{l.id}</div>
                        </div>
                      </Link>
                    );
                  })}

                  {m.lead === "offer" && !handedOver && (
                    <button
                      onClick={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, lead: "form" } : y)))}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      {t("Have the agent contact me", "أريد أن يتواصل معي المعلن")}
                    </button>
                  )}
                  {m.lead === "form" && (
                    <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3">
                      <input className={input} placeholder={t("Your name", "الاسم")} value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
                      <input className={input} placeholder="+974 …" dir="ltr" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} />
                      <label className="flex items-start gap-2 text-xs text-stone-600">
                        <input type="checkbox" className="mt-0.5" checked={leadForm.consent} onChange={(e) => setLeadForm({ ...leadForm, consent: e.target.checked })} />
                        {t("I agree that the advertiser may contact me on WhatsApp or phone about these listings.", "أوافق على أن يتواصل معي المعلن عبر واتساب أو الهاتف بخصوص هذه الإعلانات.")}
                      </label>
                      <button
                        onClick={() => submitLead(m.id, m.listings ?? [])}
                        disabled={!leadForm.name || !leadForm.phone || !leadForm.consent}
                        className={cn(btn.primary, "w-full py-2 text-xs")}
                      >
                        {t("Send to advertiser", "أرسل إلى المعلن")}
                      </button>
                    </div>
                  )}
                  {m.lead === "done" && <div className="text-xs font-medium text-emerald-700">✓ {t("The advertiser has your details.", "وصلت بياناتك إلى المعلن.")}</div>}

                  <div className="flex gap-1 text-stone-400">
                    {(["up", "down"] as const).map((r) => {
                      const Icon = r === "up" ? ThumbsUp : ThumbsDown;
                      return (
                        <button
                          key={r}
                          onClick={() => setMsgs((x) => x.map((y) => (y.id === m.id ? { ...y, rating: r } : y)))}
                          className={cn("rounded p-1 hover:bg-stone-200", m.rating === r && (r === "up" ? "text-emerald-600" : "text-red-600"))}
                          aria-label={r === "up" ? t("Helpful", "مفيد") : t("Not helpful", "غير مفيد")}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Searching live listings…", "أبحث في الإعلانات المنشورة…")}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex items-center gap-2 border-t border-stone-200 bg-white p-3"
          >
            <button
              type="button"
              onClick={voiceNote}
              disabled={recording || busy}
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50",
                recording && "animate-pulse border-red-400 bg-red-50 text-red-600",
              )}
              title={t("Send a voice note (simulated)", "أرسل رسالة صوتية (محاكاة)")}
            >
              <Mic className="h-4 w-4" />
            </button>
            <input
              value={recording ? t("Recording… transcribing", "جاري التسجيل… والتفريغ") : text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("Type your message…", "اكتب رسالتك…")}
              className={cn(input, "rounded-full")}
              disabled={recording}
            />
            <button type="submit" disabled={!text.trim() || busy} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white disabled:opacity-40">
              <Send className="flip-rtl h-4 w-4" />
            </button>
          </form>
          <div className="bg-white px-3 pb-2 text-center text-[10px] text-stone-400">
            {t("AI can make mistakes · answers grounded in live listings", "قد يخطئ الذكاء الاصطناعي · الإجابات مبنية على الإعلانات المنشورة")} · engine: {engine}
          </div>
        </div>
      )}
    </>
  );
}
