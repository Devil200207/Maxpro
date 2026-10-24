"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, FileText, RotateCcw, ShieldCheck, Webhook } from "lucide-react";
import { advertiserById, planById, roomCatName, zoneById, type Listing, type RoomCat } from "@/lib/data";
import { priceLabel } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { similarListings } from "@/lib/search";
import { uid, useStore, type ChatMsg, type Conversation, type Lead } from "@/lib/store";
import { track } from "@/lib/tracking";
import { useLang } from "@/lib/useLang";
import type { AssistantResult } from "@/lib/assistant/types";
import { toast } from "../Toaster";
import { Badge, Card, btn, cn } from "../ui";
import { Phone, type WaMsg } from "./Phone";

const CUSTOMER = "+974 3000 0000";
const PACK_ORDER: RoomCat[] = ["exterior", "living", "bedroom", "bathroom", "kitchen", "floorplan"];
const MAX_MEDIA = 10; // keep packs inside WhatsApp media limits and the configured cap
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface LogEv {
  id: string;
  at: number;
  kind: "webhook" | "api" | "consent" | "template" | "routing" | "error";
  text: string;
}

type TplStatus = "APPROVED" | "PENDING" | "REJECTED";
interface Tpl {
  name: string;
  category: "MARKETING" | "UTILITY";
  status: TplStatus;
  note?: string;
}

const L = (lang: Locale, en: string, ar: string) => (lang === "ar" ? ar : en);

const btnLabels = (lang: Locale) => ({
  pack: L(lang, "Property pack", "ملف العقار"),
  viewing: L(lang, "Book a viewing", "حجز معاينة"),
  similar: L(lang, "Similar properties", "عقارات مشابهة"),
  agent: L(lang, "Talk to agent", "تحدث مع موظف"),
  language: L(lang, "Change language", "تغيير اللغة"),
  yes: L(lang, "Yes, send me updates", "نعم، أرسلوا لي التحديثات"),
  no: L(lang, "No thanks", "لا شكراً"),
});

export function WhatsAppSim() {
  const { lang: uiLang, t, href } = useLang();
  const sp = useSearchParams();
  const { state, update } = useStore();
  const paramListing = sp.get("listing")?.toUpperCase() ?? undefined;
  const wantsPack = sp.get("pack") === "1";

  const [waLang, setWaLang] = useState<Locale>(uiLang);
  const [msgs, setMsgs] = useState<WaMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [log, setLog] = useState<LogEv[]>([]);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [ctxListing, setCtxListing] = useState<string | undefined>(paramListing);
  const [convId, setConvId] = useState<string | null>(null);
  const [tpls, setTpls] = useState<Tpl[]>([
    { name: "new_match_alert", category: "MARKETING", status: "APPROVED" },
    { name: "price_drop_alert", category: "MARKETING", status: "APPROVED" },
    { name: "listing_renewal_notice", category: "UTILITY", status: "PENDING" },
    { name: "weekend_flash_offer", category: "MARKETING", status: "REJECTED", note: "Rejected: promotional wording not allowed (policy)" },
  ]);

  const msgsRef = useRef<WaMsg[]>([]);
  const pendingRef = useRef<string | null>(null);
  const shownAgentIds = useRef<Set<string>>(new Set());
  const started = useRef(false);
  const ctxRef = useRef<string | undefined>(paramListing);
  const langRef = useRef<Locale>(uiLang);
  const convRef = useRef<string | null>(null);

  const setAll = (fn: (m: WaMsg[]) => WaMsg[]) => {
    msgsRef.current = fn(msgsRef.current);
    setMsgs(msgsRef.current);
  };
  const setCtx = (id: string | undefined) => {
    ctxRef.current = id;
    setCtxListing(id);
  };
  const addLog = useCallback((kind: LogEv["kind"], text: string) => setLog((l) => [{ id: uid("ev"), at: Date.now(), kind, text }, ...l].slice(0, 80)), []);
  const getListing = (id?: string): Listing | undefined => (id ? state.listings.find((l) => l.id === id && l.status === "live") : undefined);

  // --- Outbound (business → customer) ---
  async function botSay(parts: Omit<WaMsg, "id" | "at" | "from">[], gap = 700) {
    for (const p of parts) {
      setTyping(true);
      await sleep(gap);
      setTyping(false);
      const id = uid("wamid");
      setAll((m) => [...m, { ...p, id, from: "bot", at: Date.now() }]);
      const type = p.kind === "media" ? "image" : p.kind === "list" ? "interactive.list" : p.buttons ? "interactive.button" : p.kind;
      addLog("api", `POST /v21.0/{phone_number_id}/messages · type=${type} → 200 ${id.slice(0, 14)}`);
      setTimeout(() => addLog("webhook", `statuses: ${id.slice(0, 14)} → sent`), 250);
      setTimeout(() => addLog("webhook", `statuses: ${id.slice(0, 14)} → delivered`), 700);
      setTimeout(() => addLog("webhook", `statuses: ${id.slice(0, 14)} → read`), 1500);
    }
  }

  // --- Inbound (customer → business) ---
  function pushUser(text: string) {
    const id = uid("u");
    setAll((m) => [...m, { id, from: "user", kind: "text", text, at: Date.now(), status: "sent" }]);
    addLog("webhook", `messages (inbound) from ${CUSTOMER}: "${text.slice(0, 40)}${text.length > 40 ? "…" : ""}"`);
    const mark = (status: WaMsg["status"]) => setAll((m) => m.map((x) => (x.id === id ? { ...x, status } : x)));
    setTimeout(() => mark("delivered"), 350);
    setTimeout(() => {
      mark("read");
      addLog("api", `POST /messages {status:"read", message_id:${id.slice(0, 10)}}`);
    }, 900);
    // After handover, the human agent owns the thread.
    if (convRef.current) {
      const now = new Date().toISOString();
      const cid = convRef.current;
      update((s) => ({
        ...s,
        conversations: s.conversations.map((c) => (c.id === cid ? { ...c, updatedAt: now, messages: [...c.messages, { id, from: "user", text, at: now }] } : c)),
      }));
    }
  }

  function recordConsent(optedIn: boolean, via: string) {
    setConsent(optedIn);
    const now = new Date().toISOString();
    update((s) => ({ ...s, consents: [{ id: uid("CS"), subject: CUSTOMER, channel: "whatsapp", optedIn, at: now, via }, ...s.consents] }));
    addLog("consent", `${optedIn ? "OPT-IN" : "OPT-OUT"} ${CUSTOMER} · ${via} · ${new Date().toLocaleTimeString("en-GB")}`);
  }

  async function sendPack(id?: string) {
    const lang = langRef.current;
    const l = getListing(id);
    if (!l) {
      await botSay([{ kind: "text", text: L(lang, "Which property? Send me a listing ID (e.g. MP-10231) or tell me what you're looking for.", "أي عقار؟ أرسل رقم الإعلان (مثل MP-10231) أو أخبرني بما تبحث عنه.") }]);
      return;
    }
    track("ViewContent", { listing_id: l.id, channel: "whatsapp_pack" });
    const z = zoneById(l.zoneId).name[lang];
    const beds = l.beds === 0 ? L(lang, "Studio", "استوديو") : L(lang, `${l.beds} bed`, `${l.beds} غرف`);
    await botSay([
      {
        kind: "text",
        text: `🏠 ${l.title[lang]}\n💰 ${priceLabel(l.price, l.purpose, lang)}\n📐 ${l.area} ${L(lang, "sqm", "م²")} · ${beds} · ${l.baths} ${L(lang, "bath", "حمامات")}\n🔗 maxpro.qa/${lang}/listing/${l.id}`,
      },
      { kind: "location", location: { name: l.building?.[lang] ?? z, address: `${z}, ${L(lang, "Qatar", "قطر")}`, lat: l.lat, lng: l.lng } },
    ]);
    const ordered = PACK_ORDER.flatMap((cat) => l.media.filter((m) => m.cat === cat)).slice(0, MAX_MEDIA);
    const counts: Partial<Record<RoomCat, number>> = {};
    for (let i = 0; i < ordered.length; i++) {
      const m = ordered[i];
      counts[m.cat] = (counts[m.cat] ?? 0) + 1;
      const multi = l.media.filter((x) => x.cat === m.cat).length > 1;
      const caption = `${roomCatName[m.cat][lang]}${multi ? ` ${counts[m.cat]}` : ""} · ${i + 1}/${ordered.length}`;
      if (i === 4) {
        // Demonstrate retry-on-failure for media sends (FR-WAP-03).
        addLog("error", "POST /messages type=image → 131053 media upload error · retrying in 1s (attempt 2/3)");
        await sleep(600);
      }
      await botSay([{ kind: "media", media: { src: m.src, caption } }], 550);
    }
    const b = btnLabels(lang);
    await botSay([{ kind: "text", text: L(lang, "That's the full pack. What would you like to do next?", "هذا هو الملف الكامل. ماذا تود أن تفعل الآن؟"), buttons: [b.viewing, b.similar, b.agent] }]);
  }

  function handover(reason: string) {
    const lang = langRef.current;
    if (convRef.current) return;
    const now = new Date();
    const cid = uid("C");
    convRef.current = cid;
    setConvId(cid);
    const l = getListing(ctxRef.current);
    const transcript: ChatMsg[] = msgsRef.current
      .filter((m) => m.from !== "system")
      .map((m) => ({
        id: m.id,
        from: m.from === "user" ? "user" : m.from === "agent" ? "agent" : "bot",
        text: m.text ?? m.media?.caption ?? m.template?.body ?? m.location?.name ?? "",
        at: new Date(m.at).toISOString(),
        status: m.status,
      }));
    transcript.push({ id: uid("m"), from: "system", text: `AI handed over to a human agent: ${reason}`, at: now.toISOString() });
    const conv: Conversation = {
      id: cid,
      channel: "whatsapp",
      customer: { name: L(lang, "WhatsApp customer", "عميل واتساب"), phone: CUSTOMER, lang },
      listingId: l?.id,
      status: "open",
      tags: ["whatsapp-sim", ...(/viewing|معاينة/i.test(reason) ? ["viewing"] : [])],
      messages: transcript,
      slaDueAt: new Date(now.getTime() + 15 * 60000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      handoverReason: reason,
      source: paramListing ? "Chat on WhatsApp button (listing page)" : "WhatsApp (direct)",
    };

    // Lead routing per plan rules (FR-WAP-08).
    let lead: Lead | undefined;
    let routeNote = "";
    if (l) {
      const adv = advertiserById(l.advertiserId);
      const plan = planById(adv.planId);
      const channels = plan.features.whatsappLeads ? ["WhatsApp", "dashboard"] : ["email", "dashboard"];
      lead = {
        id: uid("L"),
        listingId: l.id,
        advertiserId: adv.id,
        name: L(lang, "WhatsApp customer", "عميل واتساب"),
        phone: CUSTOMER,
        channel: "whatsapp",
        message: reason,
        createdAt: now.toISOString(),
        status: "new",
        score: /viewing|معاينة/i.test(reason) ? 86 : 72,
        source: conv.source,
      };
      routeNote = `${lead.id} → ${adv.name.en} via ${channels.join(" + ")} (${plan.name.en} plan rule)`;
    }
    const nowIso = now.toISOString();
    update((s) => ({
      ...s,
      conversations: [conv, ...s.conversations],
      leads: lead ? [lead, ...s.leads] : s.leads,
      notifications: lead
        ? [{ id: uid("N"), at: nowIso, channel: "whatsapp", to: advertiserById(lead.advertiserId).phone, template: "new_lead_routed", status: "sent" }, ...s.notifications]
        : s.notifications,
      audit: [
        { id: uid("A"), at: nowIso, actor: "AI Support Agent", role: "ai", action: "conversation.handover", target: cid, detail: reason },
        ...(lead ? [{ id: uid("A"), at: nowIso, actor: "System", role: "system" as const, action: "lead.routed", target: lead.id, detail: routeNote }] : []),
        ...s.audit,
      ],
    }));
    addLog("routing", `Handover → inbox ${cid} (SLA 15 min)`);
    if (routeNote) addLog("routing", `Lead routed: ${routeNote}`);
    track("Contact", { channel: "whatsapp", listing_id: l?.id });
    setAll((m) => [...m, { id: uid("sys"), from: "system", kind: "text", text: L(lang, `Connecting you to a MaxPro agent · ref ${cid}`, `جارٍ تحويلك إلى موظف ماكس برو · مرجع ${cid}`), at: Date.now() }]);
    toast(t(`Handed over to inbox (${cid})`, `تم التحويل إلى صندوق الدعم (${cid})`));
  }

  async function askAssistant(text: string) {
    const lang = langRef.current;
    const history = msgsRef.current
      .filter((m) => (m.from === "user" || m.from === "bot") && (m.text || m.media))
      .map((m) => ({ role: m.from === "user" ? ("user" as const) : ("assistant" as const), content: m.text ?? m.media?.caption ?? "" }))
      .filter((m) => m.content);
    if (!history.length || history[history.length - 1].content !== text) history.push({ role: "user", content: text });
    setTyping(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-14), lang, channel: "whatsapp", listingId: ctxRef.current }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as AssistantResult;
      setTyping(false);
      addLog("api", `assistant (${data.engine}) · tools: ${data.toolCalls.map((c) => c.name).join(", ") || "none"} · ${data.latencyMs} ms`);
      if (data.validation.removed.length) addLog("error", `validation removed unverified ids: ${data.validation.removed.join(", ")}`);
      if (data.listings[0]) setCtx(data.listings[0]);
      const b = btnLabels(lang);
      const buttons = data.buttons?.length ? data.buttons.slice(0, 3) : undefined;
      await botSay([{ kind: "text", text: data.reply, buttons }], 300);
      if (data.listings.length > 1) {
        const rows = data.listings
          .map((id) => getListing(id))
          .filter((x): x is Listing => !!x)
          .map((x) => ({ id: x.id, title: x.id, desc: `${priceLabel(x.price, x.purpose, lang)} · ${x.title[lang]}`.slice(0, 72) }));
        await botSay([{ kind: "list", text: L(lang, "Tap to see any of these matches:", "اضغط لعرض أي من هذه الخيارات:"), list: { button: L(lang, "View matches", "عرض الخيارات"), title: L(lang, "Matches", "الخيارات"), rows } }], 400);
      } else if (data.buttons && data.buttons.length > 3) {
        await botSay([{ kind: "list", text: L(lang, "More options:", "خيارات أخرى:"), list: { button: L(lang, "More options", "خيارات أخرى"), title: L(lang, "Options", "الخيارات"), rows: [b.similar, b.agent, b.language].map((r) => ({ id: r, title: r })) } }], 300);
      }
      if (data.handover) handover(data.handover.reason);
    } catch {
      setTyping(false);
      addLog("error", "assistant unavailable → fallback message");
      await botSay([{ kind: "text", text: L(lang, "Sorry, I'm having trouble right now. A MaxPro agent will follow up.", "عذراً، هناك مشكلة حالياً. سيتابع معك أحد موظفي ماكس برو.") }]);
    }
  }

  async function handleText(raw: string) {
    const text = raw.trim();
    const lang = langRef.current;
    const b = btnLabels(lang);

    // Opt-out keywords are always honoured first (FR-WAP-06).
    if (/^(stop|unsubscribe|إيقاف|ايقاف|الغاء الاشتراك|إلغاء الاشتراك)$/i.test(text)) {
      recordConsent(false, `keyword "${text}"`);
      await botSay([{ kind: "text", text: L(lang, "You've been unsubscribed from MaxPro updates. You can still message us any time. Reply START to opt back in.", "تم إلغاء اشتراكك في تحديثات ماكس برو. يمكنك مراسلتنا في أي وقت. أرسل START للاشتراك مجدداً.") }]);
      return;
    }
    if (/^start$/i.test(text)) {
      recordConsent(true, 'keyword "START"');
      await botSay([{ kind: "text", text: L(lang, "Welcome back — updates are on again.", "أهلاً بعودتك — تم تفعيل التحديثات.") }]);
      return;
    }

    if (convRef.current) return; // a human has the conversation now

    // First contact: ask for marketing opt-in before anything else.
    if (consent === null && pendingRef.current === null && !msgsRef.current.some((m) => m.buttons?.includes(b.yes))) {
      pendingRef.current = text;
      const idm = text.toUpperCase().match(/MP-\d{5}/);
      if (idm) setCtx(idm[0]);
      await botSay([
        {
          kind: "text",
          text: L(
            lang,
            "Welcome to MaxPro 👋 Before we start: may we send you property updates (new matches, price drops) on WhatsApp? You can reply STOP at any time.",
            "أهلاً بك في ماكس برو 👋 قبل أن نبدأ: هل توافق على استلام تحديثات العقارات (عقارات مطابقة، انخفاض الأسعار) عبر واتساب؟ يمكنك إرسال STOP في أي وقت.",
          ),
          buttons: [b.yes, b.no],
        },
      ]);
      return;
    }
    if (text === b.yes || text === b.no || text === btnLabels(lang === "en" ? "ar" : "en").yes || text === btnLabels(lang === "en" ? "ar" : "en").no) {
      const yes = text === b.yes || text === btnLabels(lang === "en" ? "ar" : "en").yes;
      recordConsent(yes, "first-message opt-in prompt");
      const pending = pendingRef.current;
      pendingRef.current = "";
      await botSay([{ kind: "text", text: yes ? L(lang, "Thanks — you're opted in. ✅", "شكراً — تم تفعيل الاشتراك. ✅") : L(lang, "No problem — we'll only reply to your messages.", "لا مشكلة — سنرد على رسائلك فقط.") }], 400);
      if (pending) await route(pending);
      return;
    }
    await route(text);

    async function route(q: string) {
      const lq = q.toLowerCase();
      const idm = q.toUpperCase().match(/MP-\d{5}/);
      if (idm && getListing(idm[0])) setCtx(idm[0]);
      if (/property pack|ملف العقار|send.*pack/i.test(lq)) return sendPack(idm?.[0] ?? ctxRef.current);
      if (lq === b.viewing.toLowerCase() || /book a viewing|حجز معاينة/.test(lq)) {
        await botSay([
          {
            kind: "list",
            text: L(lang, "Pick a viewing slot and I'll pass it to the agent:", "اختر موعداً للمعاينة وسأرسله إلى الموظف:"),
            list: {
              button: L(lang, "Choose a slot", "اختر موعداً"),
              title: L(lang, "Viewing slots", "مواعيد المعاينة"),
              rows: [
                { id: "s1", title: L(lang, "Sat 10:00", "السبت 10:00"), desc: L(lang, "Morning", "صباحاً") },
                { id: "s2", title: L(lang, "Sat 16:30", "السبت 16:30"), desc: L(lang, "Afternoon", "مساءً") },
                { id: "s3", title: L(lang, "Sun 11:00", "الأحد 11:00"), desc: L(lang, "Morning", "صباحاً") },
              ],
            },
          },
        ]);
        return;
      }
      if (/^(sat|sun|السبت|الأحد)\s/i.test(q)) {
        await botSay([{ kind: "text", text: L(lang, `Great — I've requested ${q}. An agent will confirm with the owner shortly.`, `ممتاز — طلبت موعد ${q}. سيؤكد الموظف مع المالك قريباً.`) }]);
        handover(`Viewing request: ${q}`);
        return;
      }
      if (lq === b.similar.toLowerCase() || /similar|مشابه/.test(lq)) {
        const l = getListing(ctxRef.current);
        if (!l) return askAssistant(q);
        const sims = similarListings(state.listings, l, 3);
        await botSay([
          {
            kind: "list",
            text: L(lang, `Similar to ${l.id}:`, `عقارات مشابهة لـ ${l.id}:`),
            list: { button: L(lang, "View similar", "عرض المشابهة"), title: L(lang, "Similar properties", "عقارات مشابهة"), rows: sims.map((x) => ({ id: x.id, title: x.id, desc: `${priceLabel(x.price, x.purpose, lang)} · ${x.title[lang]}`.slice(0, 72) })) },
          },
        ]);
        return;
      }
      if (lq === b.agent.toLowerCase() || /talk to (an )?agent|تحدث مع موظف/.test(lq)) {
        await botSay([{ kind: "text", text: L(lang, "Sure — connecting you with a person now.", "بالتأكيد — سأحولك إلى موظف الآن.") }], 400);
        handover("Customer tapped 'Talk to agent'");
        return;
      }
      if (lq === b.language.toLowerCase() || /change language|تغيير اللغة/.test(lq)) {
        const next: Locale = langRef.current === "en" ? "ar" : "en";
        langRef.current = next;
        setWaLang(next);
        await botSay([{ kind: "text", text: next === "ar" ? "تم التغيير إلى العربية ✅" : "Switched to English ✅" }]);
        return;
      }
      return askAssistant(q);
    }
  }

  function onUserText(text: string) {
    pushUser(text);
    void handleText(text);
  }

  function sendTemplate(tp: Tpl) {
    const lang = langRef.current;
    if (tp.status !== "APPROVED") {
      addLog("error", `template ${tp.name} not sendable (status ${tp.status})`);
      toast(t("Only APPROVED templates can be sent", "يمكن إرسال القوالب المعتمدة فقط"));
      return;
    }
    if (consent !== true) {
      addLog("error", `template ${tp.name} blocked: ${CUSTOMER} has no WhatsApp opt-in`);
      toast(t("Blocked — customer has not opted in", "محظور — العميل لم يوافق على الاشتراك"));
      return;
    }
    const l = getListing(ctxRef.current) ?? state.listings.find((x) => x.status === "live")!;
    const z = zoneById(l.zoneId).name[lang];
    const body =
      tp.name === "new_match_alert"
        ? L(lang, `A new home matches your saved search: ${l.title.en}\n${priceLabel(l.price, l.purpose, "en")} · ${z}`, `عقار جديد يطابق بحثك المحفوظ: ${l.title.ar}\n${priceLabel(l.price, l.purpose, "ar")} · ${z}`)
        : L(lang, `Price drop on ${l.id}: now ${priceLabel(Math.round(l.price * 0.95), l.purpose, "en")} (was ${priceLabel(l.price, l.purpose, "en")})`, `انخفض سعر ${l.id}: الآن ${priceLabel(Math.round(l.price * 0.95), l.purpose, "ar")} (كان ${priceLabel(l.price, l.purpose, "ar")})`);
    const id = uid("wamid");
    setAll((m) => [
      ...m,
      {
        id,
        from: "bot",
        kind: "template",
        at: Date.now(),
        template: {
          name: tp.name,
          header: tp.name === "new_match_alert" ? L(lang, "🔔 New match", "🔔 عقار مطابق") : L(lang, "📉 Price drop", "📉 انخفاض السعر"),
          body,
          footer: L(lang, "MaxPro · Reply STOP to unsubscribe", "ماكس برو · أرسل STOP لإلغاء الاشتراك"),
          buttons: [btnLabels(lang).pack, btnLabels(lang).agent],
        },
      },
    ]);
    setCtx(l.id);
    addLog("api", `POST /messages · type=template name=${tp.name} lang=${lang} category=${tp.category} (outside 24h window) → 200`);
    setTimeout(() => addLog("webhook", `statuses: ${id.slice(0, 14)} → delivered · pricing.category=${tp.category.toLowerCase()}`), 600);
    update((s) => ({ ...s, notifications: [{ id: uid("N"), at: new Date().toISOString(), channel: "whatsapp", to: CUSTOMER, template: tp.name, status: "delivered" }, ...s.notifications] }));
  }

  function restart() {
    msgsRef.current = [];
    setMsgs([]);
    setLog([]);
    setConsent(null);
    pendingRef.current = null;
    convRef.current = null;
    setConvId(null);
    shownAgentIds.current = new Set();
    setCtx(paramListing);
    started.current = false;
    boot();
  }

  const boot = () => {
    if (started.current) return;
    started.current = true;
    addLog("webhook", "Webhook verified · subscribed fields: messages, message_template_status_update");
    addLog("api", "Phone number +974 4000 1234 · display name “MaxPro” · quality rating GREEN · Cloud API");
    if (paramListing) {
      const first = wantsPack
        ? L(langRef.current, `Please send me the property pack for ${paramListing}`, `أرسل لي ملف العقار ${paramListing} من فضلك`)
        : L(langRef.current, `Hi, I'm interested in ${paramListing}`, `مرحباً، أنا مهتم بالعقار ${paramListing}`);
      setTimeout(() => onUserText(first), 700);
    }
  };

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Template approval arrives later via webhook (FR-WAP-05).
  useEffect(() => {
    const timer = setTimeout(() => {
      setTpls((ts) => ts.map((x) => (x.name === "listing_renewal_notice" ? { ...x, status: "APPROVED" } : x)));
      addLog("template", "message_template_status_update: listing_renewal_notice PENDING → APPROVED");
    }, 15000);
    return () => clearTimeout(timer);
  }, [addLog]);

  // Mirror human-agent replies from the inbox (other tab) into the phone.
  useEffect(() => {
    if (!convId) return;
    const conv = state.conversations.find((c) => c.id === convId);
    if (!conv) return;
    const fresh = conv.messages.filter((m) => m.from === "agent" && !shownAgentIds.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => shownAgentIds.current.add(m.id));
    setAll((all) => [...all, ...fresh.map((m) => ({ id: m.id, from: "agent" as const, kind: "text" as const, text: m.text, at: Date.now(), agentName: conv.assignee ?? "MaxPro agent" }))]);
    addLog("api", `agent reply sent from inbox · ${fresh.length} message(s)`);
  }, [state.conversations, convId, addLog]);

  const ctx = getListing(ctxListing);
  const myConsents = state.consents.filter((c) => c.subject === CUSTOMER);
  const dir = waLang === "ar" ? "rtl" : "ltr";
  const labels = {
    typing: L(waLang, "typing…", "يكتب…"),
    business: L(waLang, "Official business account", "حساب أعمال رسمي"),
    placeholder: L(waLang, "Message", "رسالة"),
    today: L(waLang, "Today", "اليوم"),
    openMap: L(waLang, "Open in Maps", "فتح في الخرائط"),
  };
  const kindStyle: Record<LogEv["kind"], string> = {
    webhook: "text-sky-400",
    api: "text-emerald-400",
    consent: "text-violet-400",
    template: "text-amber-400",
    routing: "text-pink-400",
    error: "text-red-400",
  };
  const tplTone: Record<TplStatus, "green" | "amber" | "red"> = { APPROVED: "green", PENDING: "amber", REJECTED: "red" };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{t("WhatsApp experience", "تجربة واتساب")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">
            {t(
              "A live simulation of the customer's WhatsApp. Try: “2 bed in The Pearl under 13k”, the reply buttons, “Property pack”, “Talk to agent”, or STOP. Agent replies from the Support inbox appear here.",
              "محاكاة حية لواتساب العميل. جرّب: “شقة غرفتين في اللؤلؤة بأقل من 13 ألف”، أو الأزرار، أو “ملف العقار”، أو “تحدث مع موظف”، أو STOP. ردود الموظفين من صندوق الدعم تظهر هنا.",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={href("/inbox")} className={btn.secondary}>
            {t("Open support inbox", "فتح صندوق الدعم")}
          </Link>
          <button onClick={restart} className={btn.secondary}>
            <RotateCcw className="h-4 w-4" />
            {t("Restart chat", "إعادة المحادثة")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[auto_1fr]">
        <div>
          <Phone msgs={msgs} typing={typing} dir={dir} onSend={onUserText} onTap={onUserText} labels={labels} />
          <p className="mt-3 text-center text-[11px] text-stone-400">
            <ShieldCheck className="me-1 inline h-3.5 w-3.5" />
            {t("Official WhatsApp Business Cloud API — no unofficial tools", "واجهة واتساب للأعمال الرسمية (Cloud API) — بدون أدوات غير رسمية")}
          </p>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">{t("Conversation context", "سياق المحادثة")}</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-stone-600 sm:grid-cols-2">
              <div>
                <div className="text-stone-400">{t("Customer", "العميل")}</div>
                <div className="font-mono text-stone-800" dir="ltr">{CUSTOMER}</div>
                <div className="mt-1">
                  {consent === null ? <Badge>{t("Opt-in not asked yet", "لم يُطلب الاشتراك بعد")}</Badge> : consent ? <Badge tone="green">{t("Opted in", "مشترك")}</Badge> : <Badge tone="red">{t("Opted out", "ألغى الاشتراك")}</Badge>}{" "}
                  <Badge tone="blue">{t("24h service window open", "نافذة الخدمة 24 ساعة مفتوحة")}</Badge>
                </div>
              </div>
              <div>
                <div className="text-stone-400">{t("Listing in context", "العقار الحالي")}</div>
                {ctx ? (
                  <Link href={href(`/listing/${ctx.id}`)} className="mt-1 flex items-center gap-2 hover:text-brand-700">
                    <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded">
                      <Image src={ctx.media[0].src} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[11px]">{ctx.id}</span>
                      <span className="line-clamp-1">{ctx.title[uiLang]}</span>
                    </span>
                  </Link>
                ) : (
                  <div className="mt-1 text-stone-400">—</div>
                )}
              </div>
            </div>
            {convId && (
              <div className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                {t(`Human agent owns this chat now (inbox ${convId}). Reply from the Support inbox to see it here.`, `الموظف يتولى المحادثة الآن (${convId}). رد من صندوق الدعم لترى الرد هنا.`)}{" "}
                <Link href={href("/inbox")} className="font-semibold underline">
                  {t("Open inbox", "فتح الصندوق")}
                </Link>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <FileText className="h-4 w-4 text-brand-600" />
              {t("Message templates (outside the 24-hour window)", "قوالب الرسائل (خارج نافذة 24 ساعة)")}
            </h2>
            <div className="mt-3 divide-y divide-stone-100">
              {tpls.map((tp) => (
                <div key={tp.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <div className="font-mono text-xs text-stone-800">{tp.name}</div>
                    <div className="text-[11px] text-stone-400">
                      {tp.category} · en, ar{tp.note ? ` · ${tp.note}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={tplTone[tp.status]}>{tp.status}</Badge>
                    {tp.category === "MARKETING" && tp.status !== "REJECTED" && (
                      <button onClick={() => sendTemplate(tp)} disabled={tp.status !== "APPROVED"} className={cn(btn.secondary, "px-2.5 py-1.5 text-xs")}>
                        {t("Send template", "إرسال القالب")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Webhook className="h-4 w-4 text-brand-600" />
              {t("Behind the scenes", "ما يحدث خلف الكواليس")}
              <span className="ms-auto flex items-center gap-1 text-[11px] font-normal text-stone-400">
                <Activity className="h-3.5 w-3.5" /> {t("webhooks · API calls · routing", "Webhooks · استدعاءات API · التوجيه")}
              </span>
            </h2>
            <div dir="ltr" className="mt-3 h-72 overflow-y-auto rounded-lg bg-stone-950 p-3 font-mono text-[11px] leading-relaxed">
              {log.length === 0 && <div className="text-stone-500">waiting for events…</div>}
              {log.map((e) => (
                <div key={e.id} className="flex gap-2">
                  <span className="shrink-0 text-stone-500">{new Date(e.at).toLocaleTimeString("en-GB")}</span>
                  <span className={cn("shrink-0 uppercase", kindStyle[e.kind])}>{e.kind}</span>
                  <span className="text-stone-200">{e.text}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-stone-900">{t("Consent log", "سجل الموافقات")}</h2>
            <div className="mt-2 space-y-1 text-xs">
              {myConsents.length === 0 && <div className="text-stone-400">{t("No consent recorded yet for this number.", "لا توجد موافقات مسجلة لهذا الرقم بعد.")}</div>}
              {myConsents.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone={c.optedIn ? "green" : "red"}>{c.optedIn ? "OPT-IN" : "OPT-OUT"}</Badge>
                  <span className="text-stone-600">{c.via}</span>
                  <span className="text-stone-400">{new Date(c.at).toLocaleString(uiLang === "ar" ? "ar-QA-u-nu-latn" : "en-GB")}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
