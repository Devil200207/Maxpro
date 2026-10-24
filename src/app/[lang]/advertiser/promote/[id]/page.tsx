"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Gauge,
  Globe2,
  Lock,
  MessageCircle,
  OctagonX,
  Plus,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Undo2,
  X,
} from "lucide-react";
import { Badge, btn, Card, cn, input, PageTitle, ReqTag, Stat } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { advertiserById, zoneById, type Listing } from "@/lib/data";
import { compactQar, num, qar } from "@/lib/format";
import type { Bi } from "@/lib/i18n";
import { uid, useStore, type Campaign } from "@/lib/store";
import { track } from "@/lib/tracking";
import { useLang } from "@/lib/useLang";

type Objective = Campaign["objective"];

interface Draft {
  objective: Objective;
  locations: string[];
  radius: number;
  ageMin: number;
  ageMax: number;
  interests: string[];
  exclusions: string[];
  dailyBudget: number;
  days: number;
  copyEn: string;
  copyAr: string;
}

interface ToolCall {
  id: string;
  at: string;
  name: string;
  args: string;
  result: string;
  scope: "read" | "write" | "check";
}

const ADV_CAP = 5000; // QAR / month per advertiser (WP-MKT-04)
const PLATFORM_CAP = 250000;
const PLATFORM_USED = 182400;
const FEE = 0.2;

const ALL_LOCATIONS = ["Doha", "Lusail", "Al Rayyan", "Al Wakrah", "Al Khor", "Umm Salal"];
const ALL_INTERESTS = ["Real estate", "Relocation", "Luxury goods", "Investing", "Parenting", "Interior design", "Expat life"];

function draftFor(l: Listing): Draft {
  const z = zoneById(l.zoneId);
  const southern = l.zoneId === "alwakrah";
  const interests =
    l.purpose === "sale"
      ? ["Real estate", "Investing", "Luxury goods"]
      : l.suitability === "family" || l.beds >= 3
        ? ["Relocation", "Parenting", "Real estate"]
        : ["Relocation", "Expat life", "Interior design"];
  const daily = l.purpose === "sale" ? (l.price > 4_000_000 ? 250 : 150) : l.price > 15000 ? 120 : 80;
  const beds = l.beds === 0 ? "studio" : `${l.beds}-bedroom`;
  return {
    objective: "messages",
    locations: southern ? ["Al Wakrah", "Doha"] : ["Doha", "Lusail", "Al Rayyan"],
    radius: 25,
    ageMin: 18,
    ageMax: 65,
    interests,
    exclusions: [],
    dailyBudget: daily,
    days: 14,
    copyEn:
      l.purpose === "rent"
        ? `Your new ${beds} home in ${z.name.en} 🏡 ${l.furnishing === "furnished" ? "Fully furnished, " : ""}${l.area} sqm${l.view ? ` with ${l.view.en.toLowerCase()}` : ""}. QAR ${l.price.toLocaleString("en-US")}/month. Tap to get photos of every room on WhatsApp.`
        : `Own a ${beds} ${l.type} in ${z.name.en}. ${l.area} sqm, freehold where permitted. From QAR ${l.price.toLocaleString("en-US")}. Get the full property pack on WhatsApp.`,
    copyAr:
      l.purpose === "rent"
        ? `بيتك الجديد في ${z.name.ar} 🏡 ${l.beds === 0 ? "استوديو" : `${l.beds} غرف`}${l.furnishing === "furnished" ? " مفروش بالكامل" : ""}، ${l.area} م². ${l.price.toLocaleString("en-US")} ر.ق شهرياً. اضغط لتصلك صور كل غرفة على واتساب.`
        : `تملّك ${l.beds === 0 ? "استوديو" : `${l.beds} غرف`} في ${z.name.ar}. ${l.area} م². ابتداءً من ${l.price.toLocaleString("en-US")} ر.ق. احصل على ملف العقار كاملاً عبر واتساب.`,
  };
}

/** Housing special-ad-category rules, enforced in code (WP-MKT-03, FR-ADV-09). */
function policyCheck(d: Draft): { ok: boolean; issues: Bi[] } {
  const issues: Bi[] = [];
  if (d.exclusions.length)
    issues.push({
      en: `Exclusion "${d.exclusions.join(", ")}" is not allowed: housing ads cannot exclude people by nationality, religion, gender or other protected characteristics.`,
      ar: `الاستثناء "${d.exclusions.join("، ")}" غير مسموح: لا يجوز لإعلانات السكن استثناء الأشخاص حسب الجنسية أو الدين أو الجنس أو غيرها من الصفات المحمية.`,
    });
  if (d.ageMin !== 18 || d.ageMax !== 65)
    issues.push({
      en: `Age range ${d.ageMin}–${d.ageMax} is not allowed: housing ads must target ages 18–65+.`,
      ar: `الفئة العمرية ${d.ageMin}–${d.ageMax} غير مسموحة: يجب أن تستهدف إعلانات السكن الأعمار 18–65+.`,
    });
  if (d.radius < 15)
    issues.push({ en: "Location radius must be at least 15 km for housing ads.", ar: "يجب ألا يقل نطاق الموقع عن 15 كم لإعلانات السكن." });
  if (!d.locations.length) issues.push({ en: "Choose at least one location.", ar: "اختر موقعاً واحداً على الأقل." });
  return { ok: issues.length === 0, issues };
}

export default function PromotePage() {
  const { id } = useParams<{ id: string }>();
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const listing = state.listings.find((l) => l.id === id);

  if (!listing)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-stone-500">
        {t("Listing not found.", "الإعلان غير موجود.")}{" "}
        <Link href={href("/advertiser?tab=listings")} className="text-brand-600 underline">
          {t("Back to listings", "العودة للإعلانات")}
        </Link>
      </div>
    );

  return <Promote key={listing.id} listing={listing} lang={lang} t={t} p={p} href={href} state={state} update={update} />;
}

function Promote({
  listing: l,
  lang,
  t,
  p,
  href,
  state,
  update,
}: {
  listing: Listing;
  lang: "en" | "ar";
  t: (en: string, ar: string) => string;
  p: (b: Bi) => string;
  href: (s: string) => string;
  state: ReturnType<typeof useStore>["state"];
  update: ReturnType<typeof useStore>["update"];
}) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(() => draftFor(l));
  const [log, setLog] = useState<ToolCall[]>([]);
  const [thinking, setThinking] = useState(true);
  const [preview, setPreview] = useState<"en" | "ar">(lang);
  const [agree, setAgree] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const adv = advertiserById(l.advertiserId);
  const cover = (l.media.find((m) => m.cat === "exterior") ?? l.media[0]).src;
  const z = zoneById(l.zoneId);

  const pushLog = (c: Omit<ToolCall, "id" | "at">) => setLog((s) => [...s, { ...c, id: uid("tc"), at: new Date().toISOString() }]);

  // Agent run: scoped tool calls with a short "thinking" sequence (WP-MKT-01, WP-MKT-07).
  useEffect(() => {
    const seq: [number, Omit<ToolCall, "id" | "at">][] = [
      [400, { name: "listings.read", args: `{ id: "${l.id}" }`, result: `ok · ${l.media.length} media, ${l.purpose}, ${l.beds}BR, QAR ${l.price}`, scope: "read" }],
      [1100, { name: "meta.estimate_reach", args: `{ geo: ["Doha","Lusail","Al Rayyan"], age: [18,65], special_ad_category: "HOUSING" }`, result: "est. 180,000–240,000 accounts", scope: "read" }],
      [1800, { name: "creative.render_template", args: `{ template: "maxpro-maroon-v2", variants: ["feed_1x1","story_9x16"] }`, result: "2 creatives rendered (AR + EN)", scope: "read" }],
      [2400, { name: "meta.policy_check", args: `{ special_ad_category: "HOUSING", targeting: {...} }`, result: "passed · no prohibited targeting", scope: "check" }],
    ];
    const timers = seq.map(([ms, c]) => setTimeout(() => pushLog(c), ms));
    timers.push(setTimeout(() => setThinking(false), 2700));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const policy = useMemo(() => policyCheck(d), [d]);
  const spend = d.dailyBudget * d.days;
  const fee = Math.round(spend * FEE);
  const myListingIds = new Set(state.listings.filter((x) => x.advertiserId === l.advertiserId).map((x) => x.id));
  const committed = state.campaigns
    .filter((c) => myListingIds.has(c.listingId) && (c.status === "active" || c.status === "pending_approval"))
    .reduce((s, c) => s + (c.metrics ? c.metrics.spend : c.dailyBudget * c.days), 0);
  const remaining = Math.max(0, ADV_CAP - committed);
  const overCap = spend > remaining;
  const overPlatform = PLATFORM_USED + spend > PLATFORM_CAP;
  const campaigns = state.campaigns.filter((c) => c.listingId === l.id);
  const withMetrics = campaigns.find((c) => c.metrics && c.status === "active");

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggle = (k: "locations" | "interests", v: string) => set(k, d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v]);

  const steps = [t("Agent draft", "مسودة الوكيل"), t("Targeting & copy", "الاستهداف والنص"), t("Budget & caps", "الميزانية والحدود"), t("Approve", "الاعتماد")];

  const approve = () => {
    // The gate lives in application code: no approval flag → no campaign object, no API call.
    if (!agree || !policy.ok || overCap || overPlatform) return;
    const cid = uid("CMP");
    const now = new Date().toISOString();
    const c: Campaign = {
      id: cid,
      listingId: l.id,
      status: "pending_approval",
      objective: d.objective,
      audience: { locations: d.locations, ageMin: d.ageMin, ageMax: d.ageMax, interests: d.interests },
      dailyBudget: d.dailyBudget,
      days: d.days,
      serviceFee: fee,
      copy: { en: d.copyEn, ar: d.copyAr },
      createdAt: now,
    };
    update((s) => ({
      ...s,
      campaigns: [c, ...s.campaigns],
      audit: [
        { id: uid("A"), at: now, actor: adv.name.en, role: "advertiser", action: "campaign.approved_by_advertiser", target: cid, detail: `spend cap QAR ${spend}; fee QAR ${fee}` },
        { id: uid("A"), at: now, actor: "AI Marketing Agent", role: "ai", action: "tool.approval_gate.check", target: cid, detail: "passed (server-side)" },
        ...s.audit,
      ],
    }));
    pushLog({ name: "approval_gate.check", args: `{ campaign: "${cid}", approver: "${adv.name.en}" }`, result: "passed · awaiting MaxPro admin approval", scope: "check" });
    setSubmittedId(cid);
    toast(t("Approved — sent to MaxPro for final review", "تم الاعتماد — أُرسلت لمراجعة ماكس برو النهائية"));
  };

  const adminApprove = (cid: string) => {
    const now = new Date().toISOString();
    const c = state.campaigns.find((x) => x.id === cid);
    update((s) => ({
      ...s,
      campaigns: s.campaigns.map((x) => (x.id === cid ? { ...x, status: "active", approvedAt: now, metrics: { spend: 0, reach: 0, clicks: 0, leads: 0 } } : x)),
      audit: [
        { id: uid("A"), at: now, actor: "Admin", role: "admin", action: "campaign.approved_by_maxpro", target: cid },
        { id: uid("A"), at: now, actor: "AI Marketing Agent", role: "ai", action: "tool.meta.create_campaign", target: cid, detail: "special_ad_categories=[HOUSING]" },
        ...s.audit,
      ],
    }));
    pushLog({
      name: "meta.create_campaign",
      args: `{ objective: "${c?.objective.toUpperCase()}", special_ad_categories: ["HOUSING"], daily_budget: ${c?.dailyBudget} }`,
      result: `created · act_1042/campaign_${cid.slice(-6)} · ACTIVE`,
      scope: "write",
    });
    if (c) track("Purchase", { value: c.dailyBudget * c.days + c.serviceFee, currency: "QAR", campaign: cid });
    toast(t("Campaign live on Facebook & Instagram", "الحملة تعمل الآن على فيسبوك وإنستغرام"));
  };

  const copy = preview === "ar" ? d.copyAr : d.copyEn;
  const priceText = l.purpose === "rent" ? (preview === "ar" ? `${num(l.price, "ar")} ر.ق / شهرياً` : `QAR ${num(l.price, "en")} / month`) : compactQar(l.price, preview);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href={href("/advertiser?tab=listings")} className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="flip-rtl h-4 w-4" />
        {t("Back to listings", "العودة للإعلانات")}
      </Link>
      <PageTitle
        title={t("Promote on Facebook & Instagram", "روّج على فيسبوك وإنستغرام")}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{l.id}</span> · {p(l.title)}
            <Badge tone="blue">Special ad category: HOUSING</Badge>
          </span>
        }
        actions={
          <div className="flex gap-1.5">
            <ReqTag id="FR-ADV-04" />
            <ReqTag id="WP-MKT-01" />
            <ReqTag id="WP-MKT-02" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Stepper */}
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <button
                key={s}
                disabled={thinking || i > step || !!submittedId}
                onClick={() => setStep(i)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-start text-xs font-semibold transition",
                  i === step ? "border-brand-600 bg-brand-50 text-brand-800" : i < step ? "border-stone-200 bg-white text-stone-700" : "border-stone-200 bg-stone-50 text-stone-400",
                )}
              >
                <span className="me-1 opacity-60">{i + 1}.</span>
                {s}
              </button>
            ))}
          </div>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                <Bot className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="font-semibold text-stone-900">{t("MaxPro Marketing Agent", "وكيل التسويق من ماكس برو")}</div>
                {thinking ? (
                  <div className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-600" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                    {t("Reading the listing, estimating reach and drafting creatives…", "يقرأ الإعلان ويقدّر الوصول ويجهّز التصاميم…")}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-stone-600">
                    {t(
                      `I suggest a ${d.days}-day WhatsApp-messages campaign in ${d.locations.join(", ")}, around QAR ${d.dailyBudget}/day. I only draft and recommend — nothing is published or charged until you approve.`,
                      `أقترح حملة رسائل واتساب لمدة ${d.days} يوماً في ${d.locations.join("، ")} بحوالي ${d.dailyBudget} ر.ق يومياً. أنا أقترح فقط — لا يُنشر أو يُخصم شيء قبل موافقتك.`,
                    )}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {!thinking && step === 0 && (
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-stone-900">{t("Proposed plan", "الخطة المقترحة")}</h3>
                <div className="inline-flex rounded-lg border border-stone-200 p-0.5 text-xs">
                  {(["en", "ar"] as const).map((x) => (
                    <button key={x} onClick={() => setPreview(x)} className={cn("rounded-md px-2.5 py-1 font-semibold", preview === x ? "bg-stone-900 text-white" : "text-stone-600")}>
                      {x === "en" ? "EN" : "عربي"}
                    </button>
                  ))}
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-4">
                <Info label={t("Objective", "الهدف")} value={t("WhatsApp messages", "رسائل واتساب")} />
                <Info label={t("Audience", "الجمهور")} value={`${d.locations.join(", ")} · 18–65+`} />
                <Info label={t("Budget", "الميزانية")} value={`${qar(d.dailyBudget, lang)} × ${d.days}`} />
                <Info label={t("Est. reach", "الوصول المتوقع")} value="180k–240k" />
              </dl>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Facebook feed 1:1 */}
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white text-[13px]" dir={preview === "ar" ? "rtl" : "ltr"}>
                  <div className="flex items-center gap-2 p-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">MP</span>
                    <div>
                      <div className="font-semibold text-stone-900">MaxPro Qatar</div>
                      <div className="text-[11px] text-stone-500">{preview === "ar" ? "ممول" : "Sponsored"} · <Globe2 className="inline h-3 w-3" /></div>
                    </div>
                    <span className="ms-auto rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">Facebook · Feed</span>
                  </div>
                  <p className="px-3 pb-3 text-stone-800">{copy}</p>
                  <div className="relative aspect-square border-[6px] border-brand-600">
                    <Image src={cover} alt="" fill sizes="320px" className="object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-brand-900/95 to-transparent p-3 pt-10 text-white">
                      <div>
                        <div className="text-xs opacity-80">{preview === "ar" ? z.name.ar : z.name.en}</div>
                        <div className="text-lg font-bold">{priceText}</div>
                      </div>
                      <span className="rounded bg-gold-400 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-900">MaxPro</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-stone-50 p-3">
                    <div className="truncate text-xs text-stone-600">{preview === "ar" ? l.title.ar : l.title.en}</div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-800">
                      <MessageCircle className="h-3.5 w-3.5 text-wa-600" />
                      {preview === "ar" ? "أرسل رسالة" : "Send message"}
                    </span>
                  </div>
                </div>
                {/* Instagram story 9:16 */}
                <div className="mx-auto w-full max-w-[260px]" dir={preview === "ar" ? "rtl" : "ltr"}>
                  <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-black">
                    <Image src={l.media[1]?.src ?? cover} alt="" fill sizes="260px" className="object-cover opacity-90" />
                    <div className="absolute inset-x-3 top-3 flex items-center gap-2 text-white">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[9px] font-bold ring-2 ring-white">MP</span>
                      <span className="text-xs font-semibold">maxpro.qa</span>
                      <span className="text-[10px] opacity-80">{preview === "ar" ? "ممول" : "Sponsored"}</span>
                      <span className="ms-auto rounded bg-white/20 px-1.5 text-[9px]">IG · Story</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16 text-white">
                      <div className="inline-block rounded-md bg-brand-600 px-2 py-1 text-sm font-bold">{priceText}</div>
                      <p className="line-clamp-3 text-xs">{copy}</p>
                      <div className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2 text-xs font-bold text-stone-900">
                        <MessageCircle className="h-4 w-4 text-wa-600" />
                        {preview === "ar" ? "أرسل رسالة واتساب" : "Send WhatsApp message"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {!thinking && step === 1 && (
            <Card className="space-y-5 p-5">
              <div>
                <div className="mb-2 text-sm font-semibold text-stone-900">{t("Locations", "المواقع")}</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_LOCATIONS.map((loc) => (
                    <Chip key={loc} on={d.locations.includes(loc)} onClick={() => toggle("locations", loc)}>
                      {loc}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold text-stone-900">
                    {t("Radius", "النطاق")} <span className="text-brand-700">{d.radius} km</span>
                  </div>
                  <input type="range" min={15} max={60} value={d.radius} onChange={(e) => set("radius", Number(e.target.value))} className="w-full accent-brand-600" />
                  <div className="text-xs text-stone-500">{t("Minimum 15 km (housing rule)", "الحد الأدنى 15 كم (قاعدة السكن)")}</div>
                </div>
                <Locked label={t("Age", "العمر")} value={`${d.ageMin}–${d.ageMax}+`} note={t("Locked for housing ads", "مقفل لإعلانات السكن")} bad={d.ageMin !== 18 || d.ageMax !== 65} />
                <Locked label={t("Gender", "الجنس")} value={t("All", "الكل")} note={t("Gender targeting not allowed", "الاستهداف حسب الجنس غير مسموح")} />
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold text-stone-900">{t("Interests", "الاهتمامات")}</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_INTERESTS.map((it) => (
                    <Chip key={it} on={d.interests.includes(it)} onClick={() => toggle("interests", it)}>
                      {it}
                    </Chip>
                  ))}
                  {d.exclusions.map((x) => (
                    <span key={x} className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      {t("Exclude", "استثناء")}: {x}
                      <button onClick={() => set("exclusions", d.exclusions.filter((e) => e !== x))} aria-label="remove">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-stone-300 p-3">
                <div className="mb-2 text-xs font-semibold text-stone-500">{t("Demo: try a non-compliant change", "عرض: جرّب تعديلاً مخالفاً")}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => set("exclusions", Array.from(new Set([...d.exclusions, "Nationality: …"])))} className={cn(btn.secondary, "py-1.5 text-xs")}>
                    <Plus className="h-3.5 w-3.5" />
                    {t("Add exclusion: nationality", "إضافة استثناء: الجنسية")}
                  </button>
                  <button onClick={() => setD((x) => ({ ...x, ageMin: 25, ageMax: 35 }))} className={cn(btn.secondary, "py-1.5 text-xs")}>
                    {t("Target ages 25–35", "استهداف الأعمار 25–35")}
                  </button>
                  <button onClick={() => setD((x) => ({ ...x, exclusions: [], ageMin: 18, ageMax: 65 }))} className={cn(btn.ghost, "py-1.5 text-xs")}>
                    <Undo2 className="h-3.5 w-3.5" />
                    {t("Reset to compliant", "إعادة للوضع المتوافق")}
                  </button>
                </div>
              </div>
              <PolicyBox policy={policy} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block" dir="ltr">
                  <span className="mb-1 block text-sm font-semibold text-stone-900">Ad copy (English)</span>
                  <textarea className={cn(input, "min-h-28")} value={d.copyEn} onChange={(e) => set("copyEn", e.target.value)} />
                </label>
                <label className="block" dir="rtl">
                  <span className="mb-1 block text-sm font-semibold text-stone-900">نص الإعلان (عربي)</span>
                  <textarea className={cn(input, "min-h-28")} value={d.copyAr} onChange={(e) => set("copyAr", e.target.value)} />
                </label>
              </div>
            </Card>
          )}

          {!thinking && step === 2 && (
            <Card className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm font-semibold text-stone-900">
                    {t("Daily budget", "الميزانية اليومية")} <span className="text-brand-700">{qar(d.dailyBudget, lang)}</span>
                  </div>
                  <input type="range" min={50} max={600} step={10} value={d.dailyBudget} onChange={(e) => set("dailyBudget", Number(e.target.value))} className="w-full accent-brand-600" />
                </div>
                <div>
                  <div className="mb-1 text-sm font-semibold text-stone-900">{t("Duration", "المدة")}</div>
                  <div className="flex gap-2">
                    {[7, 14, 21, 30].map((n) => (
                      <Chip key={n} on={d.days === n} onClick={() => set("days", n)}>
                        {n} {t("days", "يوم")}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-stone-200">
                <Row label={t("Ad spend (paid to Meta)", "تكلفة الإعلان (تُدفع لميتا)")} value={qar(spend, lang)} />
                <Row label={t("MaxPro service fee (20%)", "رسوم خدمة ماكس برو (20٪)")} value={qar(fee, lang)} />
                <Row label={t("Total, billed as two separate lines", "الإجمالي، يُفوتر كبندين منفصلين")} value={qar(spend + fee, lang)} strong />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CapBar label={t("Your monthly cap", "حدك الشهري")} used={committed} add={spend} cap={ADV_CAP} lang={lang} />
                <CapBar label={t("Platform-wide cap", "الحد على مستوى المنصة")} used={PLATFORM_USED} add={spend} cap={PLATFORM_CAP} lang={lang} />
              </div>
              {(overCap || overPlatform) && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <OctagonX className="mt-0.5 h-4 w-4 shrink-0" />
                  {overCap
                    ? t(`This exceeds your remaining monthly cap of ${qar(remaining, "en")}. Lower the budget or duration.`, `يتجاوز حدك الشهري المتبقي ${qar(remaining, "ar")}. خفّض الميزانية أو المدة.`)
                    : t("This exceeds the platform-wide spend cap.", "يتجاوز حد الإنفاق على مستوى المنصة.")}
                </div>
              )}
              <div className="flex gap-1.5">
                <ReqTag id="WP-MKT-04" />
                <ReqTag id="FR-ADV-07" />
              </div>
            </Card>
          )}

          {!thinking && step === 3 && (
            <Card className="space-y-4 p-5">
              {!submittedId ? (
                <>
                  <h3 className="font-semibold text-stone-900">{t("Review and approve", "المراجعة والاعتماد")}</h3>
                  <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <Info label={t("Audience", "الجمهور")} value={`${d.locations.join(", ")} · ${d.radius} km · ${d.ageMin}–${d.ageMax}+`} />
                    <Info label={t("Interests", "الاهتمامات")} value={d.interests.join(", ") || "—"} />
                    <Info label={t("Ad spend", "تكلفة الإعلان")} value={`${qar(spend, lang)} (${qar(d.dailyBudget, lang)} × ${d.days})`} />
                    <Info label={t("Service fee", "رسوم الخدمة")} value={qar(fee, lang)} />
                  </dl>
                  <PolicyBox policy={policy} />
                  <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                    <span>
                      {t(
                        `I approve this campaign and authorise up to ${qar(spend, "en")} ad spend plus a ${qar(fee, "en")} MaxPro service fee.`,
                        `أوافق على هذه الحملة وأفوّض إنفاقاً إعلانياً حتى ${qar(spend, "ar")} بالإضافة إلى رسوم خدمة ${qar(fee, "ar")}.`,
                      )}
                    </span>
                  </label>
                  <div className="flex items-start gap-2 text-xs text-stone-500">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t(
                      "Enforced by the application, not the AI: the Meta API wrapper refuses to create, change or fund a campaign without a stored approval record from you (and MaxPro, where configured).",
                      "يُفرض من التطبيق وليس من الذكاء الاصطناعي: ترفض واجهة ميتا إنشاء أو تعديل أو تمويل أي حملة دون سجل موافقة محفوظ منك (ومن ماكس برو عند التفعيل).",
                    )}
                  </div>
                  <button onClick={approve} disabled={!agree || !policy.ok || overCap || overPlatform} className={cn(btn.primary, "w-full")}>
                    <ShieldCheck className="h-4 w-4" />
                    {t("Approve & submit to Meta", "اعتماد وإرسال إلى ميتا")}
                  </button>
                </>
              ) : (
                <SubmittedPanel cid={submittedId} state={state} t={t} onAdmin={adminApprove} />
              )}
            </Card>
          )}

          {!thinking && !submittedId && (
            <div className="flex justify-between">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={btn.secondary}>
                <ArrowLeft className="flip-rtl h-4 w-4" />
                {t("Back", "رجوع")}
              </button>
              {step < 3 && (
                <button
                  onClick={() => {
                    if (step === 1)
                      pushLog({ name: "meta.policy_check", args: `{ special_ad_category: "HOUSING", exclusions: ${JSON.stringify(d.exclusions)}, age: [${d.ageMin},${d.ageMax}] }`, result: policy.ok ? "passed" : `BLOCKED · ${policy.issues.length} issue(s)`, scope: "check" });
                    setStep((s) => s + 1);
                  }}
                  disabled={(step === 1 && !policy.ok) || (step === 2 && (overCap || overPlatform))}
                  className={btn.primary}
                >
                  {step === 0 ? t("Edit & continue", "تعديل ومتابعة") : t("Continue", "متابعة")}
                  <ArrowRight className="flip-rtl h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-900 px-4 py-3 text-white">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Terminal className="h-4 w-4" />
                {t("Agent tool calls", "استدعاءات أدوات الوكيل")}
              </span>
              <ReqTag id="WP-MKT-07" className="border-stone-600 text-stone-300" />
            </div>
            <ol className="max-h-80 space-y-2 overflow-y-auto bg-stone-950 p-3 font-mono text-[11px] text-stone-300" dir="ltr">
              {log.map((c) => (
                <li key={c.id} className="rounded-lg bg-stone-900 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("font-semibold", c.scope === "write" ? "text-amber-300" : c.scope === "check" ? "text-sky-300" : "text-emerald-300")}>{c.name}</span>
                    <span className="text-stone-500">{new Date(c.at).toLocaleTimeString("en-GB")}</span>
                  </div>
                  <div className="mt-0.5 break-all text-stone-400">{c.args}</div>
                  <div className="mt-0.5 text-stone-200">→ {c.result}</div>
                </li>
              ))}
              {thinking && <li className="animate-pulse text-stone-500">…</li>}
            </ol>
            <div className="border-t border-stone-100 px-4 py-2.5 text-[11px] text-stone-500">
              {t("Read-only listing access · scoped Meta wrapper · credentials server-side · every call audited", "قراءة فقط للإعلانات · واجهة ميتا محدودة · المفاتيح على الخادم · كل استدعاء مسجل")}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-stone-900">
              <Gauge className="h-4 w-4 text-brand-600" />
              {t("Campaigns for this listing", "حملات هذا الإعلان")}
            </h3>
            {campaigns.length === 0 ? (
              <p className="text-sm text-stone-400">{t("No campaigns yet.", "لا توجد حملات بعد.")}</p>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div key={c.id} className="rounded-xl border border-stone-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{c.id}</span>
                      <Badge tone={c.status === "active" ? "green" : c.status === "pending_approval" ? "amber" : "stone"}>{c.status.replace("_", " ")}</Badge>
                    </div>
                    {c.metrics ? (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                        <Metric label={t("Spend", "الإنفاق")} value={qar(c.metrics.spend, lang)} />
                        <Metric label={t("Reach", "الوصول")} value={num(c.metrics.reach, lang)} />
                        <Metric label={t("Clicks", "النقرات")} value={num(c.metrics.clicks, lang)} />
                        <Metric label={t("Leads", "العملاء")} value={num(c.metrics.leads, lang)} />
                        <Metric label="CPL" value={c.metrics.leads ? qar(Math.round((c.metrics.spend / c.metrics.leads) * 10) / 10, lang) : "—"} />
                        <Metric label={t("Fee", "الرسوم")} value={qar(c.serviceFee, lang)} />
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-500">
                        {t("Awaiting MaxPro approval", "بانتظار موافقة ماكس برو")}
                        <button onClick={() => adminApprove(c.id)} className="font-semibold text-brand-600 hover:underline">
                          {t("Simulate admin approval", "محاكاة موافقة الإدارة")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {withMetrics && withMetrics.metrics && withMetrics.metrics.leads > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-stone-900">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  {t("Weekly summary", "الملخص الأسبوعي")}
                </h3>
                <ReqTag id="WP-MKT-05" />
              </div>
              <p className="mt-2 text-sm text-stone-600">
                {t(
                  `This week your ad reached ${num(withMetrics.metrics.reach, "en")} people and brought ${withMetrics.metrics.leads} leads at QAR ${(withMetrics.metrics.spend / withMetrics.metrics.leads).toFixed(1)} each — about 18% cheaper than similar listings at ${z.name.en}. Most conversations started on Instagram Stories.`,
                  `وصل إعلانك هذا الأسبوع إلى ${num(withMetrics.metrics.reach, "ar")} شخص وجلب ${withMetrics.metrics.leads} عميلاً بتكلفة ${(withMetrics.metrics.spend / withMetrics.metrics.leads).toFixed(1)} ر.ق لكل عميل — أقل بنحو 18٪ من إعلانات مشابهة في ${z.name.ar}. بدأت معظم المحادثات من قصص إنستغرام.`,
                )}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  t("Move 20% of budget from Feed to Stories", "انقل 20٪ من الميزانية من المنشورات إلى القصص"),
                  t("Refresh the creative — frequency is 3.1", "حدّث التصميم — معدل التكرار 3.1"),
                ].map((s) => (
                  <li key={s} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2">
                    <span className="flex items-center gap-2 text-stone-700">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      {s}
                    </span>
                    <button onClick={() => toast(t("Opened for review — nothing changes until you approve", "فُتح للمراجعة — لا يتغير شيء قبل موافقتك"))} className="text-xs font-semibold text-brand-600">
                      {t("Review", "مراجعة")}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-stone-400">{t("Suggestions are never applied automatically. Sent weekly by email and WhatsApp.", "لا تُطبق الاقتراحات تلقائياً أبداً. تُرسل أسبوعياً بالبريد وواتساب.")}</p>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("Listing views", "مشاهدات الإعلان")} value={num(l.stats.views, lang)} />
            <Stat label={t("WhatsApp clicks", "نقرات واتساب")} value={num(l.stats.waClicks, lang)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmittedPanel({
  cid,
  state,
  t,
  onAdmin,
}: {
  cid: string;
  state: ReturnType<typeof useStore>["state"];
  t: (en: string, ar: string) => string;
  onAdmin: (cid: string) => void;
}) {
  const c = state.campaigns.find((x) => x.id === cid);
  const active = c?.status === "active";
  const stages = [
    { label: t("AI draft", "مسودة الذكاء الاصطناعي"), done: true },
    { label: t("Policy check", "فحص السياسات"), done: true },
    { label: t("Your approval", "موافقتك"), done: true },
    { label: t("MaxPro approval", "موافقة ماكس برو"), done: active },
    { label: t("Live on Meta", "تعمل على ميتا"), done: active },
  ];
  return (
    <div>
      <div className="flex items-center gap-2">
        <CheckCircle2 className={cn("h-5 w-5", active ? "text-emerald-600" : "text-amber-500")} />
        <h3 className="font-semibold text-stone-900">
          {active ? t("Campaign is live", "الحملة تعمل الآن") : t("Waiting for MaxPro approval", "بانتظار موافقة ماكس برو")}
        </h3>
        <span className="ms-auto font-mono text-xs text-stone-500">{cid}</span>
      </div>
      <ol className="mt-4 flex flex-wrap gap-2">
        {stages.map((s) => (
          <li key={s.label} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", s.done ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500")}>
            {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border-2 border-stone-300" />}
            {s.label}
          </li>
        ))}
      </ol>
      {!active && (
        <button onClick={() => onAdmin(cid)} className={cn(btn.secondary, "mt-4")}>
          <ShieldCheck className="h-4 w-4" />
          {t("Simulate MaxPro admin approval", "محاكاة موافقة إدارة ماكس برو")}
        </button>
      )}
    </div>
  );
}

function PolicyBox({ policy }: { policy: { ok: boolean; issues: Bi[] } }) {
  const { t, p } = useLang();
  return policy.ok ? (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <ShieldCheck className="h-4 w-4" />
      {t("Policy check passed — compliant with Meta's housing special ad category.", "اجتاز فحص السياسات — متوافق مع فئة إعلانات السكن الخاصة في ميتا.")}
      <ReqTag id="WP-MKT-03" className="ms-auto" />
    </div>
  ) : (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <div className="flex items-center gap-2 font-semibold">
        <OctagonX className="h-4 w-4" />
        {t("Blocked by policy check", "محظور بسبب فحص السياسات")}
        <ReqTag id="FR-ADV-09" className="ms-auto" />
      </div>
      <ul className="mt-2 list-disc space-y-1 ps-6 text-xs">
        {policy.issues.map((i) => (
          <li key={i.en}>{p(i)}</li>
        ))}
      </ul>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-stone-900">{value}</dd>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", on ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 text-stone-700 hover:bg-stone-50")}>
      {children}
    </button>
  );
}

function Locked({ label, value, note, bad }: { label: string; value: string; note: string; bad?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-stone-900">{label}</div>
      <div className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-sm", bad ? "border-red-300 bg-red-50 text-red-700" : "border-stone-200 bg-stone-50 text-stone-600")}>
        {value}
        <Lock className="h-3.5 w-3.5" />
      </div>
      <div className="mt-1 text-xs text-stone-500">{note}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-stone-100 px-4 py-3 text-sm last:border-0", strong && "bg-stone-50 font-bold")}>
      <span className={strong ? "text-stone-900" : "text-stone-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function CapBar({ label, used, add, cap, lang }: { label: string; used: number; add: number; cap: number; lang: "en" | "ar" }) {
  const u = Math.min(100, (used / cap) * 100);
  const a = Math.min(100 - u, (add / cap) * 100);
  const over = used + add > cap;
  return (
    <div className="rounded-xl border border-stone-200 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-stone-700">{label}</span>
        <span className={over ? "font-semibold text-red-600" : "text-stone-500"}>
          {qar(used + add, lang)} / {qar(cap, lang)}
        </span>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="bg-stone-500" style={{ width: `${u}%` }} />
        <div className={over ? "bg-red-500" : "bg-brand-600"} style={{ width: `${a}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-1.5">
      <div className="text-[10px] text-stone-500">{label}</div>
      <div className="font-semibold text-stone-900">{value}</div>
    </div>
  );
}
