"use client";

import { CheckCheck, CheckCircle2, CircleAlert, Quote, Sparkles } from "lucide-react";
import { amenities, furnishingName, propertyTypes, zones } from "@/lib/data";
import { ALL_FACTS, RECOMMENDED_FACTS, REQUIRED_FACTS, factLabel, views, type FactKey, type FactValue, type Facts } from "@/lib/studio/extract";
import { useLang } from "@/lib/useLang";
import { Badge, btn, cn, input, ReqTag } from "@/components/ui";

/** Review extracted facts: AI suggestions are visibly distinct from confirmed facts (AIS-06). */
export function FactsStep({ facts, onChange }: { facts: Facts; onChange: (f: Facts) => void }) {
  const { t, p } = useLang();
  const set = (key: FactKey, value: FactValue | undefined) => {
    const next = { ...facts };
    if (value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) delete next[key];
    else next[key] = { key, value, source: facts[key]?.source ?? "", by: "user" };
    onChange(next);
  };
  const confirm = (key: FactKey) => onChange({ ...facts, [key]: { ...facts[key]!, by: "user" } });
  const confirmAll = () => onChange(Object.fromEntries(Object.entries(facts).map(([k, f]) => [k, { ...f!, by: "user" }])) as Facts);
  const aiCount = Object.values(facts).filter((f) => f?.by === "ai").length;

  const editor = (k: FactKey) => {
    const v = facts[k]?.value;
    const sel = (opts: { id: string; label: string }[]) => (
      <select className={cn(input, "py-1.5")} value={(v as string) ?? ""} onChange={(e) => set(k, e.target.value || undefined)}>
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
    switch (k) {
      case "purpose":
        return sel([
          { id: "rent", label: t("For rent", "للإيجار") },
          { id: "sale", label: t("For sale", "للبيع") },
        ]);
      case "type":
        return sel(propertyTypes.map((x) => ({ id: x.id, label: p(x.name) })));
      case "zoneId":
        return sel(zones.map((z) => ({ id: z.id, label: p(z.name) })));
      case "furnishing":
        return sel((["furnished", "semi", "unfurnished"] as const).map((x) => ({ id: x, label: p(furnishingName[x]) })));
      case "view":
        return sel(Object.entries(views).map(([id, b]) => ({ id, label: p(b) })));
      case "amenities":
        return (
          <div className="flex flex-wrap gap-1.5">
            {amenities.map((a) => {
              const list = (v as string[]) ?? [];
              const on = list.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => set("amenities", on ? list.filter((x) => x !== a.id) : [...list, a.id])}
                  className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-stone-200 text-stone-600 hover:border-stone-300")}
                >
                  {p(a.name)}
                </button>
              );
            })}
          </div>
        );
      case "maidRoom":
      case "balcony":
        return (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!v} onChange={(e) => set(k, e.target.checked ? true : undefined)} />
            {t("Yes", "نعم")}
          </label>
        );
      case "building":
      case "permitNo":
        return <input className={cn(input, "py-1.5")} dir={k === "permitNo" ? "ltr" : undefined} value={(v as string) ?? ""} placeholder={k === "permitNo" ? "QA-RE-2026…" : ""} onChange={(e) => set(k, e.target.value)} />;
      default:
        return (
          <input
            className={cn(input, "py-1.5")}
            type="number"
            min={0}
            dir="ltr"
            value={v === undefined ? "" : String(v)}
            onChange={(e) => set(k, e.target.value === "" ? undefined : Number(e.target.value))}
          />
        );
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
          <Badge tone="violet">
            <Sparkles className="h-3 w-3" />
            {t("AI-suggested", "مقترح من الذكاء الاصطناعي")}
          </Badge>
          <Badge tone="green">
            <CheckCircle2 className="h-3 w-3" />
            {t("Confirmed by a person", "مؤكد من شخص")}
          </Badge>
          <Badge tone="red">
            <CircleAlert className="h-3 w-3" />
            {t("Missing — required", "ناقص — مطلوب")}
          </Badge>
          <ReqTag id="AIS-06" />
        </div>
        <button onClick={confirmAll} disabled={!aiCount} className={cn(btn.secondary, "py-2 text-xs")}>
          <CheckCheck className="h-4 w-4" />
          {t(`Confirm all ${aiCount} AI suggestions`, `تأكيد كل المقترحات (${aiCount})`)}
        </button>
      </div>
      <div className="divide-y divide-stone-100 rounded-xl border border-stone-200">
        {ALL_FACTS.map((k) => {
          const f = facts[k];
          const required = REQUIRED_FACTS.includes(k);
          const recommended = RECOMMENDED_FACTS.includes(k);
          return (
            <div key={k} className={cn("grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[180px_1fr_170px] sm:items-start", !f && required && "bg-red-50/40", f?.by === "ai" && "bg-violet-50/40")}>
              <div className="pt-1.5 text-sm font-medium text-stone-800">
                {p(factLabel[k])}
                {required && <span className="ms-1 text-red-500">*</span>}
              </div>
              <div>
                {editor(k)}
                {f?.source && (
                  <div className="mt-1.5 flex items-start gap-1 text-[11px] italic text-stone-500">
                    <Quote className="flip-rtl mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      {t("Source", "المصدر")}: {f.source}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 sm:justify-end sm:pt-1.5">
                {!f ? (
                  required ? (
                    <Badge tone="red">
                      <CircleAlert className="h-3 w-3" />
                      {t("Missing", "ناقص")}
                    </Badge>
                  ) : recommended ? (
                    <Badge tone="amber">{t("Recommended", "موصى به")}</Badge>
                  ) : (
                    <span className="text-xs text-stone-400">{t("Not stated", "غير مذكور")}</span>
                  )
                ) : f.by === "ai" ? (
                  <>
                    <Badge tone="violet">
                      <Sparkles className="h-3 w-3" />
                      {t("AI", "ذكاء")}
                    </Badge>
                    <button onClick={() => confirm(k)} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                      {t("Confirm", "تأكيد")}
                    </button>
                  </>
                ) : (
                  <Badge tone="green">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("Confirmed", "مؤكد")}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
