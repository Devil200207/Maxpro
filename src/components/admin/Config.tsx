"use client";

import { useMemo, useState } from "react";
import { Lock, Plus, Save, Undo2 } from "lucide-react";
import { planFeatureNames, plans as basePlans, type Plan } from "@/lib/data";
import { qar } from "@/lib/format";
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
