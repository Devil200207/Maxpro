"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Bell, ChevronLeft, ChevronRight, GitCompare, Heart, LayoutGrid, Map as MapIcon, Mail, MessageCircle, SlidersHorizontal, X } from "lucide-react";
import { advertiserById, amenityName, furnishingName, typeName, zoneById } from "@/lib/data";
import { compactQar, num, priceLabel } from "@/lib/format";
import { paramsFromQuery, queryFromParams, searchListings, type SearchQuery } from "@/lib/search";
import { uid, useStore } from "@/lib/store";
import { track } from "@/lib/tracking";
import { useLang } from "@/lib/useLang";
import { ListingCard } from "@/components/ListingCard";
import { SearchFilters } from "@/components/SearchFilters";
import { toast } from "@/components/Toaster";
import { btn, Card, cn, input, ReqTag } from "@/components/ui";

const ResultsMap = dynamic(() => import("@/components/MapView").then((m) => m.ResultsMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-stone-200" />,
});

const PAGE = 9;

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-sm text-stone-500">…</div>}>
      <SearchView />
    </Suspense>
  );
}

function SearchView() {
  const { lang, t, p, href } = useLang();
  const router = useRouter();
  const sp = useSearchParams();
  const { state, update, toggleCompare } = useStore();

  const query = useMemo(() => queryFromParams(new URLSearchParams(sp.toString())), [sp]);
  const view = sp.get("view") === "map" ? "map" : "list";
  const favouritesOnly = sp.get("favourites") === "1";
  const page = Math.max(1, Number(sp.get("page") ?? 1));

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const results = useMemo(() => {
    const r = searchListings(state.listings, query);
    return favouritesOnly ? r.filter((l) => state.favourites.includes(l.id)) : r;
  }, [state.listings, state.favourites, query, favouritesOnly]);

  const pages = Math.max(1, Math.ceil(results.length / PAGE));
  const shown = view === "map" ? results : results.slice((page - 1) * PAGE, page * PAGE);

  const push = (q: SearchQuery, extra: Record<string, string | undefined> = {}) => {
    const next = paramsFromQuery(q);
    const keep = { view: view === "map" ? "map" : undefined, favourites: favouritesOnly ? "1" : undefined, ...extra };
    for (const [k, v] of Object.entries(keep)) if (v) next.set(k, v);
    router.replace(href(`/search${next.toString() ? `?${next}` : ""}`), { scroll: false });
  };

  const qs = paramsFromQuery(query).toString();
  useEffect(() => {
    const h = setTimeout(() => track("Search", { query: qs || "all", results: results.length }), 600);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const heading = favouritesOnly
    ? t("Saved properties", "العقارات المحفوظة")
    : [
        query.type ? p(typeName(query.type)) : t("Properties", "عقارات"),
        query.purpose === "rent" ? t("for rent", "للإيجار") : query.purpose === "sale" ? t("for sale", "للبيع") : "",
        query.zone ? `${t("in", "في")} ${p(zoneById(query.zone).name)}` : t("in Qatar", "في قطر"),
      ]
        .filter(Boolean)
        .join(" ");

  const compareListings = state.compare.map((id) => state.listings.find((l) => l.id === id)).filter((l) => !!l);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => setDrawer(true)} className={cn(btn.secondary, view === "list" && "lg:hidden")}>
        <SlidersHorizontal className="h-4 w-4" />
        {t("Filters", "الفلاتر")}
      </button>
      <select
        value={query.sort ?? "featured"}
        onChange={(e) => push({ ...query, sort: e.target.value as SearchQuery["sort"] })}
        className={cn(input, "w-auto py-2")}
        aria-label={t("Sort", "ترتيب")}
      >
        <option value="featured">{t("Featured first", "المميزة أولاً")}</option>
        <option value="newest">{t("Newest", "الأحدث")}</option>
        <option value="price_asc">{t("Price: low to high", "السعر: من الأقل")}</option>
        <option value="price_desc">{t("Price: high to low", "السعر: من الأعلى")}</option>
      </select>
      <div className="flex rounded-lg border border-stone-300 bg-white p-0.5">
        <button
          onClick={() => push(query, { view: undefined })}
          className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", view === "list" ? "bg-stone-900 text-white" : "text-stone-600")}
        >
          <LayoutGrid className="h-4 w-4" />
          {t("List", "قائمة")}
        </button>
        <button
          onClick={() => {
            const next = paramsFromQuery(query);
            next.set("view", "map");
            if (favouritesOnly) next.set("favourites", "1");
            router.replace(href(`/search?${next}`), { scroll: false });
          }}
          className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", view === "map" ? "bg-stone-900 text-white" : "text-stone-600")}
        >
          <MapIcon className="h-4 w-4" />
          {t("Map", "خريطة")}
        </button>
      </div>
      <button onClick={() => setSaveOpen(true)} className={btn.secondary}>
        <Bell className="h-4 w-4" />
        {t("Save search & alert me", "احفظ البحث ونبهني")}
      </button>
    </div>
  );

  const card = (l: (typeof results)[number]) => (
    <div key={l.id} className="flex flex-col">
      <ListingCard l={l} onHover={setHoverId} />
      <label className="mt-1.5 flex cursor-pointer items-center gap-2 self-start px-1 text-xs text-stone-500">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-brand-600"
          checked={state.compare.includes(l.id)}
          disabled={!state.compare.includes(l.id) && state.compare.length >= 4}
          onChange={() => toggleCompare(l.id)}
        />
        {t("Compare", "قارن")}
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">{heading}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
            {num(results.length, lang)} {t("properties found", "عقار")}
            {favouritesOnly && (
              <Link href={href("/search")} className="font-semibold text-brand-600">
                {t("Show all", "عرض الكل")}
              </Link>
            )}
          </p>
        </div>
        {toolbar}
      </div>

      {view === "list" ? (
        <div className="flex gap-6">
          <aside className="hidden w-72 shrink-0 lg:block">
            <Card className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-5">
              <SearchFilters query={query} onChange={(q) => push(q)} />
            </Card>
          </aside>
          <div className="min-w-0 flex-1">
            {shown.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{shown.map(card)}</div>
            ) : (
              <Empty favourites={favouritesOnly} />
            )}
            {pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => push(query, { page: String(page - 1) })}
                  className={cn(btn.ghost, "disabled:opacity-40")}
                  aria-label={t("Previous", "السابق")}
                >
                  <ChevronLeft className="flip-rtl h-4 w-4" />
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => push(query, { page: n === 1 ? undefined : String(n) })}
                    className={cn("h-9 min-w-9 rounded-lg px-3 text-sm font-semibold", n === page ? "bg-brand-600 text-white" : "text-stone-700 hover:bg-stone-100")}
                  >
                    {n}
                  </button>
                ))}
                <button
                  disabled={page >= pages}
                  onClick={() => push(query, { page: String(page + 1) })}
                  className={cn(btn.ghost, "disabled:opacity-40")}
                  aria-label={t("Next", "التالي")}
                >
                  <ChevronRight className="flip-rtl h-4 w-4" />
                </button>
              </nav>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="order-2 lg:order-1">
            {shown.length ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{shown.map(card)}</div> : <Empty favourites={favouritesOnly} />}
          </div>
          <div className="order-1 lg:order-2">
            <div className="sticky top-20 h-[55vh] overflow-hidden rounded-2xl border border-stone-200 shadow-sm lg:h-[calc(100vh-7rem)]">
              <ResultsMap listings={results} hoverId={hoverId} />
              <div className="pointer-events-none absolute end-3 top-3 z-[500]">
                <ReqTag id="FR-WEB-04" className="bg-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter drawer (mobile, and map view) */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="relative ms-auto h-full w-full max-w-sm overflow-y-auto bg-white p-5 shadow-xl">
            <button onClick={() => setDrawer(false)} className="absolute end-4 top-4 rounded-lg p-1 hover:bg-stone-100" aria-label={t("Close", "إغلاق")}>
              <X className="h-5 w-5" />
            </button>
            <div className="pt-6">
              <SearchFilters query={query} onChange={(q) => push(q)} />
            </div>
            <button onClick={() => setDrawer(false)} className={cn(btn.primary, "mt-6 w-full")}>
              {t(`Show ${results.length} results`, `عرض ${results.length} نتيجة`)}
            </button>
          </div>
        </div>
      )}

      {/* Save search modal (FR-WEB-06) */}
      {saveOpen && (
        <Modal onClose={() => setSaveOpen(false)} title={t("Save this search", "احفظ هذا البحث")}>
          <p className="text-sm text-stone-600">
            {t("We'll alert you when new listings match:", "سننبهك عند نشر إعلانات مطابقة لـ:")} <span className="font-semibold text-stone-900">{heading}</span>
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { ch: "whatsapp" as const, icon: MessageCircle, label: t("WhatsApp alerts", "تنبيهات واتساب"), hint: t("Approved template · reply STOP to opt out", "قالب معتمد · أرسل STOP للإلغاء") },
              { ch: "email" as const, icon: Mail, label: t("Email alerts", "تنبيهات البريد"), hint: t("Daily digest", "ملخص يومي") },
            ].map((o) => (
              <button
                key={o.ch}
                onClick={() => {
                  update((s) => ({
                    ...s,
                    notifications: [
                      { id: uid("N"), at: new Date().toISOString(), channel: o.ch, to: o.ch === "whatsapp" ? "+974 •••• 2211" : "you@example.com", template: "saved_search_new_match", status: "queued" },
                      ...s.notifications,
                    ],
                    consents:
                      o.ch === "whatsapp"
                        ? [{ id: uid("CS"), subject: "+974 •••• 2211", channel: "whatsapp", optedIn: true, at: new Date().toISOString(), via: "Saved search alert" }, ...s.consents]
                        : s.consents,
                  }));
                  setSaveOpen(false);
                  toast(o.ch === "whatsapp" ? t("Saved — WhatsApp alerts on", "تم الحفظ — تنبيهات واتساب مفعلة") : t("Saved — email alerts on", "تم الحفظ — تنبيهات البريد مفعلة"));
                }}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-4 text-start transition hover:shadow",
                  o.ch === "whatsapp" ? "border-wa-500/40 bg-wa-500/5" : "border-stone-200",
                )}
              >
                <o.icon className={cn("h-5 w-5", o.ch === "whatsapp" ? "text-wa-600" : "text-stone-700")} />
                <span className="text-sm font-semibold text-stone-900">{o.label}</span>
                <span className="text-xs text-stone-500">{o.hint}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Compare tray */}
      {compareListings.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
            <GitCompare className="h-5 w-5 shrink-0 text-brand-600" />
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-none">
              {compareListings.map((l) => (
                <div key={l.id} className="relative flex shrink-0 items-center gap-2 rounded-lg border border-stone-200 py-1 pe-7 ps-1">
                  <div className="relative h-9 w-12 overflow-hidden rounded">
                    <Image src={l.media[0].src} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <span className="text-xs font-semibold text-stone-800">{l.id}</span>
                  <button onClick={() => toggleCompare(l.id)} className="absolute end-1 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-stone-100" aria-label={t("Remove", "إزالة")}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <span className="self-center whitespace-nowrap text-xs text-stone-400">{t(`${compareListings.length}/4 selected`, `${compareListings.length}/4 محدد`)}</span>
            </div>
            <button disabled={compareListings.length < 2} onClick={() => setCompareOpen(true)} className={btn.primary}>
              {t("Compare", "قارن")}
            </button>
          </div>
        </div>
      )}

      {compareOpen && (
        <Modal onClose={() => setCompareOpen(false)} title={t("Compare properties", "مقارنة العقارات")} wide>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr>
                  <th className="w-36" />
                  {compareListings.map((l) => (
                    <th key={l.id} className="p-2 text-start align-top font-normal">
                      <Link href={href(`/listing/${l.id}`)} className="block">
                        <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-lg">
                          <Image src={l.media[0].src} alt="" fill sizes="200px" className="object-cover" />
                        </div>
                        <div className="line-clamp-2 text-xs font-semibold text-stone-900 hover:text-brand-700">{p(l.title)}</div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {[
                  [t("Price", "السعر"), (l: (typeof compareListings)[number]) => <span className="font-bold">{l.purpose === "sale" ? compactQar(l.price, lang) : priceLabel(l.price, l.purpose, lang)}</span>],
                  [t("Type", "النوع"), (l: (typeof compareListings)[number]) => p(typeName(l.type))],
                  [t("Area", "المنطقة"), (l: (typeof compareListings)[number]) => p(zoneById(l.zoneId).name)],
                  [t("Bedrooms", "غرف النوم"), (l: (typeof compareListings)[number]) => (l.beds === 0 ? t("Studio", "استوديو") : l.beds)],
                  [t("Bathrooms", "الحمامات"), (l: (typeof compareListings)[number]) => l.baths],
                  [t("Size", "المساحة"), (l: (typeof compareListings)[number]) => `${l.area} ${t("sqm", "م²")}`],
                  [t("Price / sqm", "السعر / م²"), (l: (typeof compareListings)[number]) => `${num(Math.round(l.price / l.area), lang)}`],
                  [t("Furnishing", "التأثيث"), (l: (typeof compareListings)[number]) => p(furnishingName[l.furnishing])],
                  [t("Parking", "المواقف"), (l: (typeof compareListings)[number]) => l.parking],
                  [t("Amenities", "المرافق"), (l: (typeof compareListings)[number]) => l.amenities.map((a) => p(amenityName(a))).join("، ")],
                  [t("Advertiser", "المعلن"), (l: (typeof compareListings)[number]) => p(advertiserById(l.advertiserId).name)],
                ].map(([label, render]) => (
                  <tr key={label as string}>
                    <td className="p-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{label as string}</td>
                    {compareListings.map((l) => (
                      <td key={l.id} className="p-2 text-stone-800">
                        {(render as (l: (typeof compareListings)[number]) => React.ReactNode)(l)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Empty({ favourites }: { favourites: boolean }) {
  const { t, href } = useLang();
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <Heart className="h-8 w-8 text-stone-300" />
      <p className="font-semibold text-stone-800">
        {favourites ? t("No saved properties yet", "لا توجد عقارات محفوظة بعد") : t("No properties match these filters", "لا توجد عقارات مطابقة")}
      </p>
      <p className="text-sm text-stone-500">
        {favourites ? t("Tap the heart on any listing to save it.", "اضغط على القلب في أي إعلان لحفظه.") : t("Try widening the price range or removing filters.", "جرّب توسيع نطاق السعر أو إزالة بعض الفلاتر.")}
      </p>
      <Link href={href("/search")} className={btn.secondary}>
        {t("Browse all properties", "تصفح كل العقارات")}
      </Link>
    </Card>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl", wide ? "max-w-4xl" : "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-stone-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
