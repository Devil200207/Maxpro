"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, CloudCheck, Languages, MapPin, OctagonX, Send } from "lucide-react";
import { Badge, btn, Card, cn, input, PageTitle, ReqTag } from "@/components/ui";
import { ListingCard } from "@/components/ListingCard";
import { toast } from "@/components/Toaster";
import { PhotoStep, requiredCats, type Photo } from "@/components/advertiser/PhotoStep";
import {
  advertiserById,
  amenities,
  DEMO_NOW,
  furnishingName,
  propertyTypes,
  typeName,
  zoneById,
  zones,
  type Furnishing,
  type Listing,
  type PropertyType,
  type Purpose,
} from "@/lib/data";
import { autoChecks } from "@/lib/moderation";
import { uid, useStore } from "@/lib/store";
import { changeEntry, useAccount } from "@/components/account/useAccount";
import { AccountBar, VerificationBanner } from "@/components/account/AccountBar";
import { StageBadge } from "@/lib/stage";
import { useLang } from "@/lib/useLang";

interface Draft {
  step: number;
  purpose: Purpose;
  type: PropertyType;
  zoneId: string;
  building: string;
  beds: number;
  baths: number;
  area: number;
  floor: number;
  furnishing: Furnishing;
  price: number;
  cheques: number;
  deposit: number;
  amenities: string[];
  maidRoom: boolean;
  balcony: boolean;
  pets: boolean;
  permitNo: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  photos: Photo[];
  watermark: boolean;
}

const EMPTY: Draft = {
  step: 0,
  purpose: "rent",
  type: "apartment",
  zoneId: "pearl",
  building: "",
  beds: 2,
  baths: 2,
  area: 120,
  floor: 5,
  furnishing: "furnished",
  price: 11000,
  cheques: 12,
  deposit: 11000,
  amenities: ["pool", "gym", "security"],
  maidRoom: false,
  balcony: true,
  pets: false,
  permitNo: "",
  titleEn: "",
  titleAr: "",
  descEn: "",
  descAr: "",
  photos: [],
  watermark: true,
};

const DRAFT_KEY = "aqarpro-draft";
const DAY = 86400000;

// Template-based suggestion from the structured fields (stand-in for an MT API).
function suggest(d: Draft, lang: "en" | "ar") {
  const z = zoneById(d.zoneId).name;
  const ty = typeName(d.type);
  const f = furnishingName[d.furnishing];
  const am = d.amenities.slice(0, 3).map((a) => amenities.find((x) => x.id === a)!.name);
  if (lang === "en") {
    const beds = d.beds === 0 ? "Studio" : `${d.beds}BR`;
    return {
      title: `${f.en} ${beds} ${ty.en.toLowerCase()} in ${z.en}${d.building ? `, ${d.building}` : ""}`,
      desc: `${f.en} ${d.beds === 0 ? "open-plan" : `${d.beds}-bedroom`} ${ty.en.toLowerCase()} for ${d.purpose === "rent" ? "rent" : "sale"} in ${z.en}, ${d.area} sqm${d.floor ? ` on floor ${d.floor}` : ""}. ${d.maidRoom ? "Includes a maid's room. " : ""}${d.balcony ? "Private balcony. " : ""}Amenities: ${am.map((a) => a.en.toLowerCase()).join(", ")}.${d.purpose === "rent" ? ` Payable by ${d.cheques} cheques.` : ""}`,
    };
  }
  const beds = d.beds === 0 ? "استوديو" : `${d.beds} غرف`;
  return {
    title: `${ty.ar} ${f.ar} ${beds} في ${z.ar}${d.building ? `، ${d.building}` : ""}`,
    desc: `${ty.ar} ${f.ar} ${d.beds === 0 ? "بتصميم مفتوح" : `من ${d.beds} غرف نوم`} ${d.purpose === "rent" ? "للإيجار" : "للبيع"} في ${z.ar}، بمساحة ${d.area} م²${d.floor ? ` في الطابق ${d.floor}` : ""}. ${d.maidRoom ? "تشمل غرفة خادمة. " : ""}${d.balcony ? "شرفة خاصة. " : ""}المرافق: ${am.map((a) => a.ar).join("، ")}.${d.purpose === "rent" ? ` الدفع على ${d.cheques} شيكات.` : ""}`,
  };
}

function toListing(d: Draft, id: string, now: number, advertiserId: string, assignedAgentId?: string, status: Listing["status"] = "pending"): Listing {
  const z = zoneById(d.zoneId);
  const adv = advertiserById(advertiserId);
  return {
    id,
    orgId: adv.orgId,
    advertiserId: adv.id,
    purpose: d.purpose,
    type: d.type,
    status,
    title: { en: d.titleEn, ar: d.titleAr },
    description: { en: d.descEn, ar: d.descAr },
    price: d.price,
    negotiable: false,
    cheques: d.purpose === "rent" ? d.cheques : undefined,
    deposit: d.purpose === "rent" ? d.deposit : undefined,
    commission: d.purpose === "rent" ? "50%" : "2%",
    utilitiesIncluded: false,
    beds: d.beds,
    baths: d.baths,
    area: d.area,
    floor: d.floor || undefined,
    furnishing: d.furnishing,
    parking: d.beds >= 3 ? 2 : 1,
    maidRoom: d.maidRoom,
    balcony: d.balcony,
    pets: d.pets,
    suitability: "any",
    zoneId: d.zoneId,
    building: d.building ? { en: d.building, ar: d.building } : undefined,
    lat: z.lat + 0.002,
    lng: z.lng - 0.002,
    amenities: d.amenities,
    media: d.photos.map((ph) => ({ src: ph.src, cat: ph.cat })),
    permitNo: d.permitNo || undefined,
    promotion: "none",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 60 * DAY).toISOString(),
    source: "manual",
    stats: { views: 0, saves: 0, enquiries: 0, waClicks: 0 },
    assignedAgentId,
    priceHistory: [{ at: new Date(now).toISOString(), price: d.price }],
  };
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

export default function NewListingPage() {
  const { lang, t, p } = useLang();
  const router = useRouter();
  const { state, update } = useStore();
  const [d, setD] = useState<Draft>(EMPTY);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const loaded = useRef(false);

  // Restore the autosaved draft once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setD({ ...EMPTY, ...JSON.parse(raw) });
    } catch {}
    loaded.current = true;
  }, []);

  // Autosave (FR-LST-01 draft saving).
  useEffect(() => {
    if (!loaded.current) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      } catch {
        // Quota exceeded with large photos: keep the text fields at least.
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, photos: d.photos.filter((x) => x.sample) }));
        } catch {}
      }
      setSavedAt(new Date().toLocaleTimeString(lang === "ar" ? "ar-QA-u-nu-latn" : "en-GB", { hour: "2-digit", minute: "2-digit" }));
    }, 600);
    return () => clearTimeout(id);
  }, [d, lang]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const acct = useAccount();
  const { adv, plan, active, can, role, session, aiUsed, actorName } = acct;
  const assignee = role === "agent" ? session.memberId : undefined;
  const aiLeft = plan.quotas.aiCredits - aiUsed;

  const nextId = useMemo(() => {
    const max = state.listings.reduce((m, x) => Math.max(m, Number(x.id.replace("AQ-", "")) || 0), 0);
    return `AQ-${max + 1}`;
  }, [state.listings]);

  const preview = useMemo(() => toListing(d, nextId, DEMO_NOW, adv.id, assignee), [d, nextId, adv.id, assignee]);
  const checks = useMemo(() => autoChecks(preview, state.listings), [preview, state.listings]);
  const blocked = checks.some((c) => c.level === "block");
  const overQuota = active >= plan.quotas.listings;

  const steps = [t("Basics", "الأساسيات"), t("Details", "التفاصيل"), t("Title & description", "العنوان والوصف"), t("Photos", "الصور"), t("Review & submit", "المراجعة والإرسال")];

  const stepValid = [
    !!d.zoneId && !!d.type,
    d.price > 0 && d.area > 0,
    d.titleEn.trim().length > 5 && d.titleAr.trim().length > 3 && d.descEn.trim().length > 20 && d.descAr.trim().length > 10,
    true,
    !blocked && !overQuota && adv.verified && can.edit,
  ];

  const save = (status: "pending" | "draft") => {
    const listing = toListing(d, nextId, new Date().getTime(), adv.id, assignee, status);
    const at = new Date().toISOString();
    const warn = checks.filter((c) => c.level === "warn").map((c) => c.id);
    update((s) => ({
      ...s,
      listings: [listing, ...s.listings],
      changeLog: [changeEntry(listing.id, actorName, "created", undefined, status), ...s.changeLog],
      audit: [
        ...(status === "pending"
          ? [
              { id: uid("A"), at, actor: "System", role: "system" as const, action: "moderation.auto_checks", target: listing.id, detail: warn.length ? `warnings: ${warn.join(", ")}` : "clean" },
              { id: uid("A"), at, actor: "System", role: "system" as const, action: "plan.quota_checked", target: listing.id, detail: `${active + 1}/${plan.quotas.listings} (${plan.id})` },
            ]
          : []),
        { id: uid("A"), at, actor: actorName, role: "advertiser", action: status === "pending" ? "listing.submitted" : "listing.draft_saved", target: listing.id, detail: `source=manual; photos=${listing.media.length}` },
        ...s.audit,
      ],
    }));
    localStorage.removeItem(DRAFT_KEY);
    if (status === "draft") {
      toast(t(`Draft ${listing.id} saved`, `تم حفظ المسودة ${listing.id}`));
      router.push(`/${lang}/advertiser?tab=listings`);
      return;
    }
    toast(t("Submitted for moderation", "تم الإرسال للمراجعة"));
    router.push(`/${lang}/advertiser?submitted=${listing.id}`);
  };
  const submit = () => save("pending");

  const fillSuggestion = (target: "en" | "ar") => {
    // AIS-05 / BIL-09: each machine-translation suggestion is metered against plan AI credits.
    if (aiLeft < 2) return toast(t("AI credits used up for this month — upgrade or buy an add-on", "نفدت أرصدة الذكاء الاصطناعي لهذا الشهر — قم بالترقية"));
    update((st) => ({ ...st, aiUsage: [{ id: uid("AI"), orgId: adv.orgId, at: new Date().toISOString(), feature: "studio_write" as const, credits: 2, detail: `suggest ${target}` }, ...st.aiUsage] }));
    const s = suggest(d, target);
    setD((x) => (target === "en" ? { ...x, titleEn: s.title, descEn: s.desc } : { ...x, titleAr: s.title, descAr: s.desc }));
  };

  const numIn = (k: "beds" | "baths" | "area" | "floor" | "price" | "cheques" | "deposit", min = 0) => (
    <input type="number" min={min} className={input} value={d[k]} onChange={(e) => set(k, Number(e.target.value))} dir="ltr" />
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <AccountBar />
      <VerificationBanner />
      {!can.edit && (
        <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          {t("Read-only users can view listings but cannot create them. Switch “Acting as” to an agent, manager or owner.", "مستخدم القراءة فقط لا يمكنه إنشاء إعلانات. بدّل «بصفة» إلى وكيل أو مدير أو مالك.")}
        </div>
      )}
      <PageTitle
        title={t("Post a listing", "أضف إعلاناً")}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {p(adv.name)} · {active}/{plan.quotas.listings} {t("listings used", "إعلان مستخدم")} · {Math.max(0, aiLeft)} {t("AI credits left", "رصيد ذكاء متبقٍ")}
            <StageBadge s="S1" />
            <ReqTag id="FR-LST-01" />
          </span>
        }
        actions={
          savedAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CloudCheck className="h-4 w-4" />
              {t("Draft saved", "تم حفظ المسودة")} {savedAt}
            </span>
          )
        }
      />

      {/* Stepper */}
      <ol className="mb-6 grid grid-cols-5 gap-2">
        {steps.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => i <= d.step && set("step", i)}
              className={cn("w-full text-start", i > d.step && "cursor-default")}
            >
              <div className={cn("h-1.5 rounded-full", i < d.step ? "bg-brand-600" : i === d.step ? "bg-brand-500" : "bg-stone-200")} />
              <div className={cn("mt-2 hidden text-xs font-semibold sm:block", i === d.step ? "text-brand-700" : "text-stone-500")}>
                {i + 1}. {s}
              </div>
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-6">
        {d.step === 0 && (
          <div className="space-y-6">
            <Field label={t("Purpose", "الغرض")}>
              <div className="grid grid-cols-2 gap-3">
                {(["rent", "sale"] as Purpose[]).map((pp) => (
                  <button
                    key={pp}
                    onClick={() => set("purpose", pp)}
                    className={cn("rounded-xl border-2 p-4 text-start font-semibold", d.purpose === pp ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-200 text-stone-700")}
                  >
                    {pp === "rent" ? t("For rent", "للإيجار") : t("For sale", "للبيع")}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("Property type", "نوع العقار")}>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {propertyTypes.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setD((x) => ({ ...x, type: pt.id, beds: pt.id === "studio" || pt.id === "office" ? 0 : x.beds || 1 }))}
                    className={cn("rounded-xl border px-2 py-3 text-sm font-medium", d.type === pt.id ? "border-brand-600 bg-brand-50 text-brand-800" : "border-stone-200 text-stone-700 hover:bg-stone-50")}
                  >
                    {p(pt.name)}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("Area / zone", "المنطقة")}>
                <select className={input} value={d.zoneId} onChange={(e) => set("zoneId", e.target.value)}>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {p(z.name)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("Building / compound (optional)", "المبنى / الكمباوند (اختياري)")}>
                <input className={input} value={d.building} onChange={(e) => set("building", e.target.value)} placeholder={t("e.g. Porto Arabia Tower 7", "مثال: برج بورتو أرابيا 7")} />
              </Field>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
              <MapPin className="h-4 w-4 text-brand-600" />
              {t("Map pin set automatically from the zone", "تم تحديد الموقع تلقائياً من المنطقة")}:{" "}
              <span className="font-mono" dir="ltr">
                {zoneById(d.zoneId).lat.toFixed(4)}, {zoneById(d.zoneId).lng.toFixed(4)}
              </span>
              · {t("advertisers can drag it to the exact building", "يمكن للمعلن سحبه إلى المبنى بدقة")}
            </div>
          </div>
        )}

        {d.step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label={t("Bedrooms", "غرف النوم")}>{numIn("beds")}</Field>
              <Field label={t("Bathrooms", "الحمامات")}>{numIn("baths", 1)}</Field>
              <Field label={t("Built-up area (sqm)", "المساحة (م²)")}>{numIn("area", 1)}</Field>
              <Field label={t("Floor", "الطابق")}>{numIn("floor")}</Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={d.purpose === "rent" ? t("Monthly rent (QAR)", "الإيجار الشهري (ر.ق)") : t("Sale price (QAR)", "سعر البيع (ر.ق)")}>{numIn("price", 1)}</Field>
              {d.purpose === "rent" && (
                <>
                  <Field label={t("Cheques per year", "عدد الشيكات")}>
                    <select className={input} value={d.cheques} onChange={(e) => set("cheques", Number(e.target.value))}>
                      {[1, 2, 4, 6, 12].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("Security deposit (QAR)", "التأمين (ر.ق)")}>{numIn("deposit")}</Field>
                </>
              )}
            </div>
            <Field label={t("Furnishing", "التأثيث")}>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(furnishingName) as Furnishing[]).map((f) => (
                  <button key={f} onClick={() => set("furnishing", f)} className={cn("rounded-full border px-4 py-1.5 text-sm", d.furnishing === f ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 text-stone-700")}>
                    {p(furnishingName[f])}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={t("Amenities", "المرافق")}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {amenities.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={d.amenities.includes(a.id)}
                      onChange={(e) => set("amenities", e.target.checked ? [...d.amenities, a.id] : d.amenities.filter((x) => x !== a.id))}
                    />
                    {p(a.name)}
                  </label>
                ))}
              </div>
            </Field>
            <div className="flex flex-wrap gap-6">
              {(
                [
                  ["maidRoom", t("Maid's room", "غرفة خادمة")],
                  ["balcony", t("Balcony", "شرفة")],
                  ["pets", t("Pets allowed", "يسمح بالحيوانات")],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-stone-700">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={d[k]} onChange={(e) => set(k, e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
            <Field
              label={t("Advertising permit number", "رقم ترخيص الإعلان")}
              hint={
                <span className="flex items-center gap-1.5">
                  {t("Required by Qatar real-estate advertising rules — exact field list to be confirmed (decision D-04).", "مطلوب حسب أنظمة الإعلان العقاري في قطر — قائمة الحقول النهائية قيد التأكيد (القرار D-04).")}
                  <ReqTag id="NFR-LEG-01" />
                </span>
              }
            >
              <input className={input} dir="ltr" placeholder="QA-RE-2026xxxxx" value={d.permitNo} onChange={(e) => set("permitNo", e.target.value)} />
            </Field>
          </div>
        )}

        {d.step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-900">
              <Languages className="h-4 w-4" />
              {t("Both languages are required. Use the suggestion buttons to generate an editable machine-translation suggestion from your details.", "اللغتان مطلوبتان. استخدم أزرار الاقتراح لتوليد ترجمة آلية مقترحة قابلة للتعديل من بياناتك.")}
              <ReqTag id="FR-LST-02" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3" dir="ltr">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">English</span>
                  <button onClick={() => fillSuggestion("en")} className="text-xs font-semibold text-brand-600 hover:underline">
                    {t("Suggest English", "اقترح بالإنجليزية")}
                  </button>
                </div>
                <input className={input} placeholder="Title" value={d.titleEn} onChange={(e) => set("titleEn", e.target.value)} maxLength={90} />
                <textarea className={cn(input, "min-h-40")} placeholder="Description" value={d.descEn} onChange={(e) => set("descEn", e.target.value)} />
              </div>
              <div className="space-y-3" dir="rtl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">العربية</span>
                  <button onClick={() => fillSuggestion("ar")} className="text-xs font-semibold text-brand-600 hover:underline">
                    {t("Suggest Arabic translation", "اقترح ترجمة عربية")}
                  </button>
                </div>
                <input className={input} placeholder="العنوان" value={d.titleAr} onChange={(e) => set("titleAr", e.target.value)} maxLength={90} />
                <textarea className={cn(input, "min-h-40")} placeholder="الوصف" value={d.descAr} onChange={(e) => set("descAr", e.target.value)} />
              </div>
            </div>
            <p className="text-xs italic text-stone-500">{t("Machine-translation suggestion — editable. Always review before submitting.", "ترجمة آلية مقترحة — قابلة للتعديل. يرجى المراجعة قبل الإرسال.")}</p>
          </div>
        )}

        {d.step === 3 && (
          <PhotoStep
            photos={d.photos}
            setPhotos={(fn) => setD((x) => ({ ...x, photos: fn(x.photos) }))}
            watermark={d.watermark}
            setWatermark={(v) => set("watermark", v)}
            beds={d.beds}
            baths={d.baths}
          />
        )}

        {d.step === 4 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
            <div className="space-y-4 md:col-span-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900">{t("Automatic checks", "الفحوصات التلقائية")}</h3>
                <ReqTag id="FR-LST-05" />
              </div>
              <ul className="space-y-2">
                {checks.map((c) => (
                  <li
                    key={c.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-sm",
                      c.level === "block" ? "border-red-200 bg-red-50 text-red-900" : c.level === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900",
                    )}
                  >
                    {c.level === "block" ? <OctagonX className="mt-0.5 h-4 w-4 shrink-0" /> : c.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                    <div>
                      <div className="font-semibold">{p(c.label)}</div>
                      {c.detail && <div className="text-xs opacity-80">{p(c.detail)}</div>}
                    </div>
                    <Badge tone={c.level === "block" ? "red" : c.level === "warn" ? "amber" : "green"} className="ms-auto">
                      {c.level === "block" ? t("Must fix", "يجب الإصلاح") : c.level === "warn" ? t("Moderator will review", "سيراجعه المشرف") : "OK"}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", overQuota ? "border-red-200 bg-red-50 text-red-900" : "border-stone-200 bg-stone-50 text-stone-700")}>
                {overQuota ? <OctagonX className="h-4 w-4" /> : <Check className="h-4 w-4 text-emerald-600" />}
                {t("Plan quota", "حد الباقة")}: {active} / {plan.quotas.listings} {t("active listings", "إعلان نشط")} ({p(plan.name)})
                <ReqTag id="BIL-09" className="ms-auto" />
              </div>
              <div className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm", adv.verified ? "border-stone-200 bg-stone-50 text-stone-700" : "border-amber-200 bg-amber-50 text-amber-900")}>
                {adv.verified ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4" />}
                {adv.verified
                  ? t("Advertiser verified — listing can be submitted for moderation", "المعلن موثق — يمكن إرسال الإعلان للمراجعة")
                  : t("Advertiser not verified yet — you can save this as a draft and submit once verified", "المعلن غير موثق بعد — احفظ مسودة وأرسلها بعد التوثيق")}
              </div>
              {assignee && (
                <p className="text-xs text-stone-500">{t("Will be assigned to you as the listing agent.", "سيُسند إليك كوكيل الإعلان.")}</p>
              )}
              {requiredCats(d.beds).some((c) => !d.photos.some((x) => x.cat === c)) && (
                <p className="text-xs text-stone-500">{t("Tip: go back to Photos and use sample photos to complete the gallery.", "نصيحة: ارجع إلى الصور واستخدم الصور التجريبية لإكمال المعرض.")}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="mb-2 text-sm font-semibold text-stone-900">{t("Preview", "معاينة")}</div>
              {preview.media.length > 0 ? (
                <ListingCard l={preview} />
              ) : (
                <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-stone-300 text-sm text-stone-400">{t("Add photos to preview", "أضف صوراً للمعاينة")}</div>
              )}
              <p className="mt-2 text-xs text-stone-500">
                {t("Will be published as", "سيُنشر برقم")} <span className="font-mono font-semibold">{nextId}</span> {t("after approval.", "بعد الموافقة.")}
              </p>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => set("step", Math.max(0, d.step - 1))} disabled={d.step === 0} className={btn.secondary}>
          <ArrowLeft className="flip-rtl h-4 w-4" />
          {t("Back", "رجوع")}
        </button>
        {d.step < 4 ? (
          <button onClick={() => set("step", d.step + 1)} disabled={!stepValid[d.step]} className={btn.primary}>
            {t("Continue", "متابعة")}
            <ArrowRight className="flip-rtl h-4 w-4" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => save("draft")} disabled={!can.edit || !stepValid[2]} className={btn.secondary}>
              {t("Save as draft", "حفظ كمسودة")}
            </button>
            <button onClick={submit} disabled={!stepValid[4]} title={adv.verified ? undefined : t("Verification required before publishing", "التوثيق مطلوب قبل النشر")} className={btn.primary}>
              <Send className="flip-rtl h-4 w-4" />
              {t("Submit for moderation", "إرسال للمراجعة")}
            </button>
          </div>
        )}
      </div>
      {d.step === 2 && !stepValid[2] && (
        <p className="mt-2 text-end text-xs text-stone-500">{t("Fill in both languages to continue.", "أكمل اللغتين للمتابعة.")}</p>
      )}
    </div>
  );
}
