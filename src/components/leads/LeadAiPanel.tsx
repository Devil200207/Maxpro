"use client";

import { useState } from "react";
import { Send, Sparkles, Wand2 } from "lucide-react";
import { advertiserById, zoneById } from "@/lib/data";
import { priceLabel } from "@/lib/format";
import { addAiUsage, aiCreditsFor, scoreLead } from "@/lib/leads";
import { StageBadge, StageGate } from "@/lib/stage";
import { uid, useStore, type Lead } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { toast } from "../Toaster";
import { Badge, btn, cn, input, ReqTag } from "../ui";

const COST = { classify: 1, rescore: 1, draft: 3 };

/** Heuristic intent classifier standing in for the LLM call (same tool-based layer in production). */
function classify(l: Lead) {
  const m = l.message.toLowerCase();
  if (/viewing|visit|معاينة|saturday|sunday|weekend/.test(m)) return { en: "Viewing request", ar: "طلب معاينة" };
  if (/price|discount|negotiat|تخفيض|السعر|\d+k/.test(m)) return { en: "Price negotiation", ar: "تفاوض على السعر" };
  if (/cash|mortgage|pre-?approved|budget|buy/.test(m)) return { en: "Buyer — financing ready", ar: "مشترٍ — التمويل جاهز" };
  if (/available|still|متاح/.test(m)) return { en: "Availability question", ar: "سؤال عن التوفر" };
  if (/pet|parking|furnish|bills|موقف|حيوان/.test(m)) return { en: "Property detail question", ar: "سؤال عن تفاصيل العقار" };
  return { en: "General enquiry", ar: "استفسار عام" };
}

/**
 * LED-04 (Stage 2): AI classification, re-scoring and reply drafting. Drafts are editable and
 * only go out when a person presses Send — nothing is sent automatically.
 */
export function LeadAiPanel({ lead, canEdit, onResponded }: { lead: Lead; canEdit: boolean; onResponded: () => void }) {
  const { lang, t, p } = useLang();
  const { state, update } = useStore();
  const orgId = advertiserById(lead.advertiserId).orgId;
  const credits = aiCreditsFor(state, orgId);
  const [intent, setIntent] = useState<{ en: string; ar: string } | null>(null);
  const [draftLang, setDraftLang] = useState<"en" | "ar">(lang);
  const [draft, setDraft] = useState("");
  const listing = lead.listingId ? state.listings.find((x) => x.id === lead.listingId) : undefined;

  const spend = (feature: keyof typeof COST, detail: string) => {
    if (credits.left < COST[feature]) {
      toast(t("Out of AI credits for this plan — upgrade or wait for renewal", "نفدت أرصدة الذكاء الاصطناعي لهذه الباقة — رقِّ الباقة أو انتظر التجديد"));
      return false;
    }
    update((s) => addAiUsage(s, orgId, "lead_reply", COST[feature], detail));
    return true;
  };

  const doClassify = () => {
    if (!spend("classify", `classify ${lead.id}`)) return;
    setIntent(classify(lead));
  };

  const doRescore = () => {
    if (!spend("rescore", `re-score ${lead.id}`)) return;
    const score = scoreLead({
      ...lead,
      signals: { viewing: lead.status === "viewing", turns: (lead.notes?.length ?? 0) + 1, financing: /cash|pre-?approved/i.test(lead.message) },
    });
    update((s) => ({ ...s, leads: s.leads.map((x) => (x.id === lead.id ? { ...x, score } : x)) }));
    toast(t(`Score updated to ${score}`, `تم تحديث التقييم إلى ${score}`));
  };

  const doDraft = (dl: "en" | "ar") => {
    if (!spend("draft", `reply draft ${lead.id} (${dl})`)) return;
    setDraftLang(dl);
    const first = lead.name.split(" ")[0];
    const title = listing ? listing.title[dl] : "";
    const price = listing ? priceLabel(listing.price, listing.purpose, dl) : "";
    const zone = listing ? zoneById(listing.zoneId).name[dl] : "";
    setDraft(
      dl === "ar"
        ? `مرحباً ${first}، شكراً لاهتمامك${title ? ` بـ «${title}»` : ""}${zone ? ` في ${zone}` : ""}. ${price ? `السعر ${price}. ` : ""}العقار متاح حالياً، ويسعدني ترتيب معاينة — هل يناسبك السبت الساعة 10 صباحاً أو الأحد الساعة 4 مساءً؟`
        : `Hi ${first}, thanks for your interest${title ? ` in “${title}”` : ""}${zone ? ` in ${zone}` : ""}. ${price ? `It's ${price}. ` : ""}It's currently available and I'd be happy to arrange a viewing — would Saturday 10am or Sunday 4pm work for you?`,
    );
  };

  const sendDraft = (via: "whatsapp" | "email") => {
    if (!draft.trim()) return;
    const now = new Date().toISOString();
    const me = state.team.find((m) => m.id === state.session.memberId)?.name ?? "Agent";
    update((s) => ({
      ...s,
      leads: s.leads.map((x) =>
        x.id === lead.id
          ? {
              ...x,
              status: x.status === "new" ? "contacted" : x.status,
              firstResponseAt: x.firstResponseAt ?? now,
              notes: [...(x.notes ?? []), { id: uid("N"), at: now, by: me, text: `Reply sent via ${via} (AI draft, reviewed by ${me}): ${draft.slice(0, 220)}` }],
            }
          : x,
      ),
      notifications: [{ id: uid("N"), at: now, channel: via, to: via === "email" ? `${lead.name.split(" ")[0].toLowerCase()}@example.com` : (lead.phone ?? "—"), template: "agent_reply", status: "sent" }, ...s.notifications],
      audit: [{ id: uid("A"), at: now, actor: me, role: "advertiser", action: "lead.reply_sent", target: lead.id, detail: `via=${via}; ai_draft=true; human_reviewed=true` }, ...s.audit],
    }));
    setDraft("");
    onResponded();
    toast(t("Reply sent — logged on the lead", "تم إرسال الرد — سُجّل على العميل"));
  };

  return (
    <StageGate stage="S2" label={t("AI lead assistant — Stage 2 (LED-04)", "مساعد العملاء الذكي — المرحلة الثانية (LED-04)")} className="p-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-violet-900">
            <Sparkles className="h-4 w-4" />
            {t("AI assist", "مساعدة الذكاء الاصطناعي")}
            <StageBadge s="S2" />
          </h4>
          <span className="text-[11px] text-violet-700">
            {t(`${credits.left} AI credits left`, `${credits.left} رصيد ذكاء متبقٍ`)} <ReqTag id="LED-04" className="ms-1" />
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button disabled={!canEdit} onClick={doClassify} className={cn(btn.secondary, "px-2.5 py-1.5 text-xs")}>
            <Wand2 className="h-3.5 w-3.5" /> {t("Classify intent", "تصنيف النية")}
          </button>
          <button disabled={!canEdit} onClick={doRescore} className={cn(btn.secondary, "px-2.5 py-1.5 text-xs")}>
            {t("Re-score", "إعادة التقييم")}
          </button>
          <button disabled={!canEdit} onClick={() => doDraft("en")} className={cn(btn.secondary, "px-2.5 py-1.5 text-xs")}>
            {t("Draft reply (EN)", "مسودة رد (EN)")}
          </button>
          <button disabled={!canEdit} onClick={() => doDraft("ar")} className={cn(btn.secondary, "px-2.5 py-1.5 text-xs")}>
            {t("Draft reply (AR)", "مسودة رد (AR)")}
          </button>
        </div>
        {intent && (
          <div className="mt-2 text-xs text-violet-900">
            {t("Intent:", "النية:")} <Badge tone="violet">{p(intent)}</Badge>
          </div>
        )}
        {draft && (
          <div className="mt-2">
            <textarea dir={draftLang === "ar" ? "rtl" : "ltr"} value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(input, "min-h-24 text-xs")} />
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-violet-700">{t("AI draft — edit before sending. Never sent automatically.", "مسودة ذكاء اصطناعي — عدّلها قبل الإرسال. لا تُرسل تلقائياً.")}</span>
              <div className="flex gap-1.5">
                <button onClick={() => sendDraft("whatsapp")} className={cn(btn.wa, "px-2.5 py-1.5 text-xs")}>
                  <Send className="flip-rtl h-3.5 w-3.5" /> WhatsApp
                </button>
                <button onClick={() => sendDraft("email")} className={cn(btn.secondary, "px-2.5 py-1.5 text-xs")}>
                  {t("Email", "البريد")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </StageGate>
  );
}
