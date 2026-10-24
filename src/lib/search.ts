import { amenityName, type Furnishing, type Listing, type PropertyType, type Purpose, typeName, zoneById, zones } from "./data";

export interface SearchQuery {
  purpose?: Purpose;
  type?: PropertyType;
  zone?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number; // minimum; 0 = studio
  baths?: number;
  minArea?: number;
  furnishing?: Furnishing;
  amenities?: string[];
  q?: string;
  sort?: "featured" | "newest" | "price_asc" | "price_desc";
}

/**
 * Arabic-aware normalisation (NFR-I18-01): unify alef forms, taa marbuta,
 * alef maqsura, strip tashkeel and tatweel, so "الؤلؤة" / "اللؤلؤه" still match.
 */
export function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Small synonym table (would be an analyser + synonym file in OpenSearch).
const synonyms: Record<string, string[]> = {
  flat: ["apartment"],
  شقه: ["apartment"],
  فيلا: ["villa"],
  فله: ["villa"],
  بحر: ["sea", "beach"],
  sea: ["beach"],
  مسبح: ["pool"],
  furnished: ["مفروشه"],
  مفروشه: ["furnished"],
};

function haystack(l: Listing) {
  const z = zoneById(l.zoneId).name;
  const t = typeName(l.type);
  return normalize(
    [
      l.id,
      l.title.en,
      l.title.ar,
      l.description.en,
      l.description.ar,
      z.en,
      z.ar,
      t.en,
      t.ar,
      l.building?.en ?? "",
      l.building?.ar ?? "",
      l.view?.en ?? "",
      l.view?.ar ?? "",
      ...l.amenities.flatMap((a) => [amenityName(a).en, amenityName(a).ar, a]),
    ].join(" "),
  );
}

export function matchesKeyword(l: Listing, q: string) {
  const hay = haystack(l);
  return normalize(q)
    .split(" ")
    .filter(Boolean)
    .every((tok) => hay.includes(tok) || (synonyms[tok] ?? []).some((s) => hay.includes(s)));
}

export function searchListings(all: Listing[], q: SearchQuery): Listing[] {
  let r = all.filter((l) => l.status === "live");
  if (q.purpose) r = r.filter((l) => l.purpose === q.purpose);
  if (q.type) r = r.filter((l) => l.type === q.type);
  if (q.zone) r = r.filter((l) => l.zoneId === q.zone);
  if (q.minPrice) r = r.filter((l) => l.price >= q.minPrice!);
  if (q.maxPrice) r = r.filter((l) => l.price <= q.maxPrice!);
  if (q.beds !== undefined) r = r.filter((l) => (q.beds === 0 ? l.beds === 0 : l.beds >= q.beds!));
  if (q.baths) r = r.filter((l) => l.baths >= q.baths!);
  if (q.minArea) r = r.filter((l) => l.area >= q.minArea!);
  if (q.furnishing) r = r.filter((l) => l.furnishing === q.furnishing);
  if (q.amenities?.length) r = r.filter((l) => q.amenities!.every((a) => l.amenities.includes(a)));
  if (q.q?.trim()) r = r.filter((l) => matchesKeyword(l, q.q!));

  const promoRank = { premium: 2, featured: 1, none: 0 } as const;
  const sort = q.sort ?? "featured";
  return [...r].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return promoRank[b.promotion] - promoRank[a.promotion] || b.createdAt.localeCompare(a.createdAt);
  });
}

export function similarListings(all: Listing[], l: Listing, n = 4) {
  return all
    .filter((x) => x.id !== l.id && x.status === "live" && x.purpose === l.purpose)
    .map((x) => ({
      x,
      score:
        (x.type === l.type ? 3 : 0) +
        (x.zoneId === l.zoneId ? 2 : 0) +
        (Math.abs(x.beds - l.beds) <= 1 ? 2 : 0) +
        (Math.abs(x.price - l.price) / l.price < 0.3 ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((s) => s.x);
}

export function queryFromParams(sp: URLSearchParams): SearchQuery {
  const n = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  return {
    purpose: (sp.get("purpose") as Purpose) || undefined,
    type: (sp.get("type") as PropertyType) || undefined,
    zone: sp.get("zone") || undefined,
    minPrice: n("min"),
    maxPrice: n("max"),
    beds: n("beds"),
    baths: n("baths"),
    furnishing: (sp.get("furnishing") as Furnishing) || undefined,
    amenities: sp.get("amenities")?.split(",").filter(Boolean),
    q: sp.get("q") || undefined,
    sort: (sp.get("sort") as SearchQuery["sort"]) || undefined,
  };
}

export function paramsFromQuery(q: SearchQuery) {
  const sp = new URLSearchParams();
  if (q.purpose) sp.set("purpose", q.purpose);
  if (q.type) sp.set("type", q.type);
  if (q.zone) sp.set("zone", q.zone);
  if (q.minPrice) sp.set("min", String(q.minPrice));
  if (q.maxPrice) sp.set("max", String(q.maxPrice));
  if (q.beds !== undefined) sp.set("beds", String(q.beds));
  if (q.baths) sp.set("baths", String(q.baths));
  if (q.furnishing) sp.set("furnishing", q.furnishing);
  if (q.amenities?.length) sp.set("amenities", q.amenities.join(","));
  if (q.q) sp.set("q", q.q);
  if (q.sort) sp.set("sort", q.sort);
  return sp;
}

export const zoneIds = zones.map((z) => z.id);
