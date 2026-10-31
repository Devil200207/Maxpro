"use client";

import { useMemo, useState } from "react";
import { Lock, Pause, Play, Plus, Save, Undo2 } from "lucide-react";
import { advertisers, planFeatureNames, plans as basePlans, zones, type Plan } from "@/lib/data";
import { num, qar } from "@/lib/format";
import type { Bi } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { toast } from "@/components/Toaster";
import { Badge, btn, Card, cn, input } from "@/components/ui";
import { SectionHead } from "./shared";
import { StageBadge } from "@/lib/stage";

const ADMIN = "Admin";

// ---------------- Plans ----------------

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
type QuotaKey = keyof Plan["quotas"];

const quotaRows: { key: QuotaKey; en: string; ar: string }[] = [
  { key: "listings", en: "Listing quota", ar: "عدد الإعلانات" },
  { key: "featuredCredits", en: "Featured credits / month", ar: "أرصدة التمييز شهرياً" },
  { key: "seats", en: "Team seats", ar: "مقاعد الفريق" },
  { key: "bumpsPerMonth", en: "Bumps / month", ar: "مرات التحديث شهرياً" },
  { key: "aiCredits", en: "AI credits / month", ar: "أرصدة الذكاء الاصطناعي شهرياً" },
  { key: "portals", en: "Portal connections", ar: "ربط البوابات" },
];

function diffPlans(a: Plan[], b: Plan[]) {
  const out: { id: string; changes: string[] }[] = [];
  for (const nb of b) {
    const na = a.find((x) => x.id === nb.id);
    if (!na) {
      out.push({ id: nb.id, changes: ["created"] });
      continue;
    }
    const ch: string[] = [];
    if (na.monthly !== nb.monthly) ch.push(`monthly ${na.monthly} → ${nb.monthly}`);
    for (const k of Object.keys(nb.quotas) as QuotaKey[]) if (na.quotas[k] !== nb.quotas[k]) ch.push(`${k} ${na.quotas[k]} → ${nb.quotas[k]}`);
    for (const f of Object.keys(nb.features)) if (!!na.features[f] !== !!nb.features[f]) ch.push(`${f} ${na.features[f] ? "on" : "off"} → ${nb.features[f] ? "on" : "off"}`);
    if (ch.length) out.push({ id: nb.id, changes: ch });
  }
  return out;
}

export function PlansEditor() {
  const { lang, t, p } = useLang();
  const { audit } = useStore();
  const [saved, setSaved] = useState<Plan[]>(() => clone(basePlans));
  const [draft, setDraft] = useState<Plan[]>(() => clone(basePlans));
  const diff = useMemo(() => diffPlans(saved, draft), [saved, draft]);

  const set = (id: string, fn: (pl: Plan) => Plan) => setDraft((d) => d.map((x) => (x.id === id ? fn(clone(x)) : x)));

  const save = () => {
    diff.forEach((d) => audit({ actor: ADMIN, role: "admin", action: d.changes[0] === "created" ? "plan.created" : "plan.updated", target: d.id, detail: d.changes.join("; ") }));
    setSaved(clone(draft));
    toast(t(`${diff.length} plan(s) updated — effective on next renewal`, `تم تحديث ${diff.length} باقة — تسري عند التجديد القادم`));
  };

  const addPlan = () => {
    const n = draft.filter((x) => x.id.startsWith("custom")).length + 1;
    setDraft((d) => [
      ...d,
      {
        id: `custom-${n}`,
        name: { en: `New plan ${n}`, ar: `باقة جديدة ${n}` },
        tagline: { en: "", ar: "" },
        monthly: 999,
        quotas: { listings: 50, featuredCredits: 10, seats: 3, bumpsPerMonth: 50, aiCredits: 500, portals: 2 },
        features: Object.fromEntries(Object.keys(planFeatureNames).map((k) => [k, false])),
      },
    ]);
  };

  return (
    <div>
      <SectionHead
        title={t("Plans & pricing engine", "محرك الباقات والأسعار")}
        desc={t(
          "No plan is hard-coded — prices, quotas, seats and feature flags are data. New plan types (e.g. service-directory profiles) or future ERP module entitlements are added here, not in code.",
          "لا توجد باقة مثبتة في الكود — الأسعار والحصص والمقاعد ومفاتيح الميزات بيانات. تُضاف أنواع باقات جديدة أو صلاحيات وحدات ERP مستقبلاً من هنا.",
        )}
        req={["FR-BIL-01", "WP-ERX-03", "FR-ADM-02"]}
        stage="S1"
        actions={
          <>
            <button onClick={addPlan} className={cn(btn.secondary, "py-1.5 text-xs")}>
              <Plus className="h-3.5 w-3.5" />
              {t("Add plan type", "إضافة نوع باقة")}
            </button>
            <button onClick={() => setDraft(clone(saved))} disabled={!diff.length} className={cn(btn.ghost, "py-1.5 text-xs disabled:opacity-40")}>
              <Undo2 className="h-3.5 w-3.5" />
              {t("Discard", "تجاهل")}
            </button>
            <button onClick={save} disabled={!diff.length} className={cn(btn.primary, "py-1.5 text-xs")}>
              <Save className="h-3.5 w-3.5" />
              {t("Save changes", "حفظ التغييرات")} {diff.length > 0 && `(${diff.length})`}
            </button>
          </>
        }
      />

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50 text-start">
              <th className="w-56 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-stone-500">{t("Setting", "الإعداد")}</th>
              {draft.map((pl) => (
                <th key={pl.id} className="px-3 py-3 text-start">
                  {pl.id.startsWith("custom") ? (
                    <input
                      value={p(pl.name)}
                      onChange={(e) => set(pl.id, (x) => ({ ...x, name: { ...x.name, [lang]: e.target.value } }))}
                      className={cn(input, "py-1 text-sm font-semibold")}
                    />
                  ) : (
                    <span className="font-semibold text-stone-900">{p(pl.name)}</span>
                  )}
                  {diff.some((d) => d.id === pl.id) && <span className="ms-1.5 inline-block h-2 w-2 rounded-full bg-amber-400" title="unsaved" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            <tr>
              <td className="px-4 py-2.5 text-stone-700">{t("Monthly price (QAR)", "السعر الشهري (ر.ق)")}</td>
              {draft.map((pl) => (
                <td key={pl.id} className="px-3 py-2">
                  {pl.monthly === -1 ? (
                    <Badge tone="violet">{t("Custom quote", "عرض سعر خاص")}</Badge>
                  ) : (
                    <input type="number" min={0} value={pl.monthly} onChange={(e) => set(pl.id, (x) => ({ ...x, monthly: Number(e.target.value) }))} className={cn(input, "w-28 py-1 tabular-nums")} />
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-stone-500">{t("Annual price (2 months free)", "السعر السنوي (شهران مجاناً)")}</td>
              {draft.map((pl) => (
                <td key={pl.id} className="px-3 py-2 text-xs tabular-nums text-stone-500">
                  {pl.monthly > 0 ? qar(pl.monthly * 10, lang) : "—"}
                </td>
              ))}
            </tr>
            {quotaRows.map((r) => (
              <tr key={r.key}>
                <td className="px-4 py-2.5 text-stone-700">{t(r.en, r.ar)}</td>
                {draft.map((pl) => (
                  <td key={pl.id} className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={pl.quotas[r.key]}
                      onChange={(e) => set(pl.id, (x) => ({ ...x, quotas: { ...x.quotas, [r.key]: Number(e.target.value) } }))}
                      className={cn(input, "w-24 py-1 tabular-nums")}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-stone-50">
              <td colSpan={draft.length + 1} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                {t("Feature flags / entitlements", "مفاتيح الميزات / الصلاحيات")}
              </td>
            </tr>
            {Object.keys(planFeatureNames).map((f) => (
              <tr key={f}>
                <td className="px-4 py-2 text-stone-700">{p(planFeatureNames[f])}</td>
                {draft.map((pl) => (
                  <td key={pl.id} className="px-3 py-2">
                    <Toggle on={!!pl.features[f]} onChange={(v) => set(pl.id, (x) => ({ ...x, features: { ...x.features, [f]: v } }))} />
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-2 text-stone-400">{t("ERP modules (future)", "وحدات ERP (مستقبلاً)")}</td>
              {draft.map((pl) => (
                <td key={pl.id} className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                    <Lock className="h-3 w-3" />
                    {t("Phase 2", "المرحلة 2")}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Card>

      {diff.length > 0 && (
        <Card className="mt-3 border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <div className="font-semibold">{t("Pending changes (will be written to the audit trail)", "تغييرات معلقة (ستُسجل في سجل التدقيق)")}</div>
          <ul className="mt-1 list-disc ps-5 font-mono">
            {diff.map((d) => (
              <li key={d.id}>
                {d.id}: {d.changes.join("; ")}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-40", on ? "bg-brand-600" : "bg-stone-300")}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition", on ? "translate-x-4.5 rtl:-translate-x-4.5" : "translate-x-0.5 rtl:-translate-x-0.5")} />
    </button>
  );
}

// ---------------- Ad inventory ----------------

type Placement = "home_hero" | "search_top" | "listing_sidebar" | "featured_carousel" | "sponsored_search";

const placementName: Record<Placement, Bi> = {
  home_hero: { en: "Home hero banner", ar: "بانر الصفحة الرئيسية" },
  search_top: { en: "Search results — top banner", ar: "بانر أعلى نتائج البحث" },
  listing_sidebar: { en: "Listing page — sidebar", ar: "الشريط الجانبي لصفحة الإعلان" },
  featured_carousel: { en: "Featured carousel", ar: "شريط الإعلانات المميزة" },
  sponsored_search: { en: "Sponsored search position", ar: "موضع ممول في البحث" },
};

interface Slot {
  id: string;
  placement: Placement;
  advertiserId: string;
  start: string;
  end: string;
  zone?: string;
  purpose?: "rent" | "sale";
  impressions: number;
  clicks: number;
  price: number;
  active: boolean;
}

const seedSlots: Slot[] = [
  { id: "AD-101", placement: "home_hero", advertiserId: "adv-dohaprime", start: "2026-10-15", end: "2026-10-31", impressions: 184200, clicks: 2210, price: 6500, active: true },
  { id: "AD-102", placement: "search_top", advertiserId: "adv-lusailhomes", start: "2026-10-01", end: "2026-11-30", zone: "lusail", purpose: "sale", impressions: 52300, clicks: 1046, price: 3200, active: true },
  { id: "AD-103", placement: "listing_sidebar", advertiserId: "adv-pearlgate", start: "2026-10-10", end: "2026-11-10", zone: "pearl", impressions: 38900, clicks: 498, price: 1800, active: true },
  { id: "AD-104", placement: "featured_carousel", advertiserId: "adv-pearlgate", start: "2026-10-20", end: "2026-11-20", purpose: "rent", impressions: 21400, clicks: 940, price: 150, active: true },
  { id: "AD-105", placement: "sponsored_search", advertiserId: "adv-sara", start: "2026-10-05", end: "2026-11-05", zone: "alduhail", purpose: "rent", impressions: 9800, clicks: 312, price: 400, active: false },
  { id: "AD-106", placement: "sponsored_search", advertiserId: "adv-dohaprime", start: "2026-11-01", end: "2026-11-30", zone: "westbay", purpose: "rent", impressions: 0, clicks: 0, price: 400, active: true },
];

export function AdInventory() {
  const { lang, t, p } = useLang();
  const { audit } = useStore();
  const [slots, setSlots] = useState<Slot[]>(seedSlots);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Omit<Slot, "id" | "impressions" | "clicks" | "active">>({
    placement: "search_top",
    advertiserId: "adv-pearlgate",
    start: "2026-11-01",
    end: "2026-11-30",
    zone: "",
    purpose: undefined,
    price: 2500,
  });

  const totals = slots.reduce((a, s) => ({ imp: a.imp + s.impressions, clk: a.clk + s.clicks, rev: a.rev + (s.active ? s.price : 0) }), { imp: 0, clk: 0, rev: 0 });

  const toggle = (s: Slot) => {
    setSlots((xs) => xs.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    audit({ actor: ADMIN, role: "admin", action: s.active ? "ad_slot.paused" : "ad_slot.resumed", target: s.id });
  };

  const add = () => {
    const id = `AD-${107 + slots.length - seedSlots.length}`;
    setSlots((xs) => [{ ...form, zone: form.zone || undefined, id, impressions: 0, clicks: 0, active: true }, ...xs]);
    audit({ actor: ADMIN, role: "admin", action: "ad_slot.created", target: id, detail: `${form.placement}; ${form.start}→${form.end}` });
    setAdding(false);
    toast(t("Ad slot scheduled", "تمت جدولة المساحة الإعلانية"));
  };

  return (
    <div>
      <SectionHead
        title={t("On-site ad inventory", "المساحات الإعلانية في الموقع")}
        desc={t("Banner slots, featured carousels and sponsored search positions with scheduling, targeting and impression/click tracking.", "بانرات وشرائط مميزة ومواضع ممولة في البحث مع الجدولة والاستهداف وتتبع الظهور والنقرات.")}
        req={["FR-ADV-01"]}
        stage="S1"
        actions={
          <button onClick={() => setAdding((v) => !v)} className={cn(btn.primary, "py-1.5 text-xs")}>
            <Plus className="h-3.5 w-3.5" />
            {t("New slot", "مساحة جديدة")}
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-stone-500">{t("Impressions (period)", "مرات الظهور")}</div>
          <div className="text-xl font-bold tabular-nums">{num(totals.imp, lang)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-stone-500">{t("Clicks · CTR", "النقرات · نسبة النقر")}</div>
          <div className="text-xl font-bold tabular-nums">
            {num(totals.clk, lang)} · {((totals.clk / Math.max(1, totals.imp)) * 100).toFixed(2)}%
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-stone-500">{t("Booked revenue (active)", "الإيرادات المحجوزة")}</div>
          <div className="text-xl font-bold tabular-nums">{qar(totals.rev, lang)}</div>
        </Card>
      </div>

      {adding && (
        <Card className="mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-stone-600">
            {t("Placement", "الموضع")}
            <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as Placement })} className={cn(input, "mt-1 py-2")}>
              {(Object.keys(placementName) as Placement[]).map((k) => (
                <option key={k} value={k}>
                  {p(placementName[k])}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-stone-600">
            {t("Advertiser", "المعلن")}
            <select value={form.advertiserId} onChange={(e) => setForm({ ...form, advertiserId: e.target.value })} className={cn(input, "mt-1 py-2")}>
              {advertisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {p(a.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-stone-600">
            {t("Start", "البداية")}
            <input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={cn(input, "mt-1 py-2")} />
          </label>
          <label className="text-xs font-medium text-stone-600">
            {t("End", "النهاية")}
            <input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={cn(input, "mt-1 py-2")} />
          </label>
          <label className="text-xs font-medium text-stone-600">
            {t("Target zone", "المنطقة المستهدفة")}
            <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className={cn(input, "mt-1 py-2")}>
              <option value="">{t("All Qatar", "كل قطر")}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {p(z.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-stone-600">
            {t("Purpose", "الغرض")}
            <select value={form.purpose ?? ""} onChange={(e) => setForm({ ...form, purpose: (e.target.value || undefined) as Slot["purpose"] })} className={cn(input, "mt-1 py-2")}>
              <option value="">{t("Rent & sale", "إيجار وبيع")}</option>
              <option value="rent">{t("Rent", "إيجار")}</option>
              <option value="sale">{t("Sale", "بيع")}</option>
            </select>
          </label>
          <label className="text-xs font-medium text-stone-600">
            {t("Price (QAR)", "السعر (ر.ق)")}
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className={cn(input, "mt-1 py-2")} />
          </label>
          <div className="flex items-end gap-2">
            <button onClick={add} className={cn(btn.primary, "py-2 text-xs")}>
              {t("Schedule", "جدولة")}
            </button>
            <button onClick={() => setAdding(false)} className={cn(btn.ghost, "py-2 text-xs")}>
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              {[t("Slot", "المساحة"), t("Placement", "الموضع"), t("Advertiser", "المعلن"), t("Schedule", "الجدولة"), t("Targeting", "الاستهداف"), t("Impr.", "الظهور"), t("Clicks", "النقرات"), "CTR", t("Price", "السعر"), ""].map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-start font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {slots.map((s) => {
              const adv = advertisers.find((a) => a.id === s.advertiserId)!;
              return (
                <tr key={s.id} className={cn(!s.active && "text-stone-400")}>
                  <td className="px-3 py-2.5 font-mono text-xs">{s.id}</td>
                  <td className="px-3 py-2.5">{p(placementName[s.placement])}</td>
                  <td className="px-3 py-2.5">{p(adv.name)}</td>
                  <td className="px-3 py-2.5 text-xs tabular-nums" dir="ltr">
                    {s.start} → {s.end}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {s.zone ? p(zones.find((z) => z.id === s.zone)!.name) : t("All Qatar", "كل قطر")}
                    {s.purpose && ` · ${s.purpose === "rent" ? t("Rent", "إيجار") : t("Sale", "بيع")}`}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{num(s.impressions, lang)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{num(s.clicks, lang)}</td>
                  <td className="px-3 py-2.5 tabular-nums">{s.impressions ? `${((s.clicks / s.impressions) * 100).toFixed(2)}%` : "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{qar(s.price, lang)}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggle(s)} className={cn(btn.ghost, "px-2 py-1 text-xs")}>
                      {s.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {s.active ? t("Pause", "إيقاف") : t("Resume", "استئناف")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------------- Feature flags ----------------

interface FlagDef {
  id: string;
  name: Bi;
  desc: Bi;
  on: boolean;
  rollout: number;
  locked?: boolean;
  stage: "S1" | "S2" | "later";
}

const seedFlags: FlagDef[] = [
  { id: "portal_hub", name: { en: "Portal Integration Hub", ar: "مركز ربط البوابات" }, desc: { en: "Publish to external portals via connectors (HUB-01..13).", ar: "النشر على البوابات الخارجية عبر الموصلات." }, on: true, rollout: 100, stage: "S1" },
  { id: "ai_listing_studio", name: { en: "AI Listing Studio", ar: "استوديو الإعلانات الذكي" }, desc: { en: "AI intake and bilingual drafts with quality checks (AIS-01..07).", ar: "إدخال ذكي ومسودات ثنائية اللغة مع فحص الجودة." }, on: true, rollout: 100, stage: "S1" },
  { id: "live_portal_connector", name: { en: "First live portal connector", ar: "أول موصل بوابة حي" }, desc: { en: "Enabled once portal access is authorised (HUB-12, D-09).", ar: "يُفعّل بعد تفويض الوصول للبوابة." }, on: false, rollout: 0, stage: "S2" },
  { id: "wa_property_packs", name: { en: "WhatsApp property packs", ar: "ملفات العقار عبر واتساب" }, desc: { en: "Summary + categorised media sent on request (FR-WAP-03).", ar: "ملخص وصور مصنفة عند الطلب." }, on: true, rollout: 100, stage: "S2" },
  { id: "ai_assistant", name: { en: "AI assistant (web + WhatsApp)", ar: "المساعد الذكي (الموقع وواتساب)" }, desc: { en: "Guided discovery grounded in live listings (WP-SUP-01..07).", ar: "بحث موجّه من الإعلانات المنشورة فقط." }, on: true, rollout: 50, stage: "S2" },
  { id: "marketing_agent", name: { en: "Marketing agent", ar: "الوكيل التسويقي" }, desc: { en: "Campaign drafting with approval gate (WP-MKT-01..07).", ar: "صياغة الحملات مع بوابة موافقة." }, on: true, rollout: 25, stage: "S2" },
  { id: "meta_catalogue", name: { en: "Meta catalogue sync", ar: "مزامنة كتالوج ميتا" }, desc: { en: "Live listings feed for dynamic ads (FR-ADV-03).", ar: "تغذية الإعلانات الديناميكية." }, on: false, rollout: 0, stage: "S2" },
  { id: "bulk_upload", name: { en: "Bulk upload (CSV / Excel / feed)", ar: "الرفع الجماعي" }, desc: { en: "Agency inventory import (FR-LST-08).", ar: "استيراد مخزون الوكالات." }, on: true, rollout: 100, stage: "S2" },
  { id: "services_directory", name: { en: "Services directory", ar: "دليل الخدمات" }, desc: { en: "New vertical via listing-type engine (WP-ERX-04).", ar: "قطاع جديد عبر محرك أنواع الإعلانات." }, on: false, rollout: 0, stage: "S1" },
  { id: "erp_connector", name: { en: "ERP connector", ar: "موصل ERP" }, desc: { en: "Event subscriber for Odoo / ERPNext — out of scope for this engagement.", ar: "خارج نطاق هذه المرحلة." }, on: false, rollout: 0, locked: true, stage: "later" },
];

export function FeatureFlags() {
  const { t, p } = useLang();
  const { audit } = useStore();
  const [flags, setFlags] = useState(seedFlags);

  const change = (f: FlagDef, patch: Partial<FlagDef>, log = true) => {
    setFlags((xs) => xs.map((x) => (x.id === f.id ? { ...x, ...patch } : x)));
    if (log) audit({ actor: ADMIN, role: "admin", action: "flag.updated", target: f.id, detail: Object.entries(patch).map(([k, v]) => `${k}=${v}`).join("; ") });
  };

  return (
    <div>
      <SectionHead
        title={t("Feature flags", "مفاتيح الميزات")}
        desc={t("Staged rollout of modules by percentage of users, so new capability ships safely after launch.", "إطلاق تدريجي للوحدات بنسبة من المستخدمين لضمان إطلاق آمن.")}
        req={["FR-ADM-07"]}
        stage="S1"
      />
      <Card className="divide-y divide-stone-100">
        {flags.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
            <Toggle on={f.on} disabled={f.locked} onChange={(v) => change(f, { on: v, rollout: v && f.rollout === 0 ? 10 : f.rollout })} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                {p(f.name)}
                <span className="font-mono text-[10px] font-normal text-stone-400">{f.id}</span>
                {f.stage === "later" ? (
                  <Badge>
                    <Lock className="h-3 w-3" />
                    {t("Future phase", "مرحلة لاحقة")}
                  </Badge>
                ) : (
                  <StageBadge s={f.stage} />
                )}
              </div>
              <div className="text-xs text-stone-500">{p(f.desc)}</div>
            </div>
            <div className="flex w-56 items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={f.rollout}
                disabled={!f.on || f.locked}
                onChange={(e) => change(f, { rollout: Number(e.target.value) }, false)}
                onMouseUp={() => audit({ actor: ADMIN, role: "admin", action: "flag.rollout", target: f.id, detail: `rollout=${f.rollout}%` })}
                className="flex-1 accent-brand-600 disabled:opacity-40"
              />
              <span className="w-10 text-end text-xs font-semibold tabular-nums text-stone-700">{f.on ? `${f.rollout}%` : "off"}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
