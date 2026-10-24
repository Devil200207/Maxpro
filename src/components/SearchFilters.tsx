"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { amenities, furnishingName, propertyTypes, zones, type Furnishing, type PropertyType, type Purpose } from "@/lib/data";
import type { SearchQuery } from "@/lib/search";
import { useLang } from "@/lib/useLang";
import { cn, input, ReqTag } from "./ui";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
        active ? "border-brand-600 bg-brand-600 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</div>
      {children}
    </div>
  );
}

export function SearchFilters({ query, onChange }: { query: SearchQuery; onChange: (q: SearchQuery) => void }) {
  const { t, p } = useLang();
  const [kw, setKw] = useState(query.q ?? "");
  const [minP, setMinP] = useState(query.minPrice ? String(query.minPrice) : "");
  const [maxP, setMaxP] = useState(query.maxPrice ? String(query.maxPrice) : "");

  // Keep local text inputs in sync when the URL changes from elsewhere (e.g. reset).
  const urlKey = `${query.q ?? ""}|${query.minPrice ?? ""}|${query.maxPrice ?? ""}`;
  const [prevKey, setPrevKey] = useState(urlKey);
  if (urlKey !== prevKey) {
    setPrevKey(urlKey);
    if ((query.q ?? "") !== kw.trim()) setKw(query.q ?? "");
    if (String(query.minPrice ?? "") !== minP) setMinP(query.minPrice ? String(query.minPrice) : "");
    if (String(query.maxPrice ?? "") !== maxP) setMaxP(query.maxPrice ? String(query.maxPrice) : "");
  }

  const latest = useRef(query);
  useEffect(() => {
    latest.current = query;
  }, [query]);

  // Debounce free-text inputs.
  useEffect(() => {
    const h = setTimeout(() => {
      const query = latest.current;
      const next = {
        q: kw.trim() || undefined,
        minPrice: minP ? Number(minP) : undefined,
        maxPrice: maxP ? Number(maxP) : undefined,
      };
      if (next.q !== query.q || next.minPrice !== query.minPrice || next.maxPrice !== query.maxPrice) onChange({ ...query, ...next });
    }, 450);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kw, minP, maxP]);

  const set = (patch: Partial<SearchQuery>) => onChange({ ...query, ...patch });
  const toggleAmenity = (id: string) => {
    const cur = query.amenities ?? [];
    set({ amenities: cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-stone-900">{t("Filters", "الفلاتر")}</h2>
        <div className="flex items-center gap-2">
          <ReqTag id="FR-WEB-03" />
          <button
            type="button"
            onClick={() => onChange({ sort: query.sort })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            <RotateCcw className="h-3 w-3" />
            {t("Reset", "إعادة")}
          </button>
        </div>
      </div>

      <Field label={t("Keyword", "كلمة البحث")}>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input value={kw} onChange={(e) => setKw(e.target.value)} placeholder={t("e.g. sea view, مسبح, Porto", "مثال: إطلالة بحرية، pool، بورتو")} className={cn(input, "ps-9")} />
        </div>
        <p className="mt-1 text-[11px] text-stone-400">{t("Arabic-aware: spelling variants of أ/ا, ة/ه, ى/ي match", "بحث ذكي بالعربية: يطابق أ/ا و ة/ه و ى/ي")}</p>
      </Field>

      <Field label={t("Purpose", "الغرض")}>
        <div className="flex flex-wrap gap-2">
          <Chip active={!query.purpose} onClick={() => set({ purpose: undefined })}>
            {t("All", "الكل")}
          </Chip>
          {(["rent", "sale"] as Purpose[]).map((pp) => (
            <Chip key={pp} active={query.purpose === pp} onClick={() => set({ purpose: pp })}>
              {pp === "rent" ? t("Rent", "إيجار") : t("Buy", "شراء")}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label={t("Property type", "نوع العقار")}>
        <select value={query.type ?? ""} onChange={(e) => set({ type: (e.target.value as PropertyType) || undefined })} className={input}>
          <option value="">{t("All types", "كل الأنواع")}</option>
          {propertyTypes.map((pt) => (
            <option key={pt.id} value={pt.id}>
              {p(pt.name)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("Area", "المنطقة")}>
        <select value={query.zone ?? ""} onChange={(e) => set({ zone: e.target.value || undefined })} className={input}>
          <option value="">{t("All areas", "كل المناطق")}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {p(z.name)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("Price (QAR)", "السعر (ر.ق)")}>
        <div className="grid grid-cols-2 gap-2">
          <input inputMode="numeric" value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))} placeholder={t("Min", "الأدنى")} className={input} />
          <input inputMode="numeric" value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))} placeholder={t("Max", "الأعلى")} className={input} />
        </div>
      </Field>

      <Field label={t("Bedrooms", "غرف النوم")}>
        <div className="flex flex-wrap gap-2">
          <Chip active={query.beds === undefined} onClick={() => set({ beds: undefined })}>
            {t("Any", "الكل")}
          </Chip>
          <Chip active={query.beds === 0} onClick={() => set({ beds: 0 })}>
            {t("Studio", "استوديو")}
          </Chip>
          {[1, 2, 3, 4, 5].map((b) => (
            <Chip key={b} active={query.beds === b} onClick={() => set({ beds: b })}>
              {b}+
            </Chip>
          ))}
        </div>
      </Field>

      <Field label={t("Bathrooms", "الحمامات")}>
        <div className="flex flex-wrap gap-2">
          <Chip active={!query.baths} onClick={() => set({ baths: undefined })}>
            {t("Any", "الكل")}
          </Chip>
          {[1, 2, 3, 4].map((b) => (
            <Chip key={b} active={query.baths === b} onClick={() => set({ baths: b })}>
              {b}+
            </Chip>
          ))}
        </div>
      </Field>

      <Field label={t("Furnishing", "التأثيث")}>
        <div className="flex flex-wrap gap-2">
          <Chip active={!query.furnishing} onClick={() => set({ furnishing: undefined })}>
            {t("Any", "الكل")}
          </Chip>
          {(Object.keys(furnishingName) as Furnishing[]).map((f) => (
            <Chip key={f} active={query.furnishing === f} onClick={() => set({ furnishing: f })}>
              {p(furnishingName[f])}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label={t("Amenities", "المرافق")}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {amenities.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={query.amenities?.includes(a.id) ?? false}
                onChange={() => toggleAmenity(a.id)}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600"
              />
              <span className="truncate">{p(a.name)}</span>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
