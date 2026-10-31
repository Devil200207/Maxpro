import { amenities, zones, type Furnishing, type PropertyType, type Purpose } from "../data";
import type { Bi } from "../i18n";

/**
 * Deterministic, bilingual fact extraction for the AI Listing Studio (AIS-01).
 * Every fact carries the exact source snippet it came from. Nothing is inferred
 * without a matching phrase in the source text (AIS-06: never fabricate).
 */

export type FactKey =
  | "purpose"
  | "type"
  | "zoneId"
  | "building"
  | "beds"
  | "baths"
  | "area"
  | "price"
  | "furnishing"
  | "floor"
  | "view"
  | "amenities"
  | "permitNo"
  | "maidRoom"
  | "balcony"
  | "cheques";

export type FactValue = string | number | boolean | string[];

export interface Fact {
  key: FactKey;
  value: FactValue;
  /** Snippet of the source text that supports the value. Empty for facts entered by a person. */
  source: string;
  /** "ai" = extracted and not yet confirmed; "user" = typed or confirmed by a person. */
  by: "ai" | "user";
}

export type Facts = Partial<Record<FactKey, Fact>>;

export const REQUIRED_FACTS: FactKey[] = ["purpose", "type", "zoneId", "beds", "baths", "area", "price", "furnishing"];
export const RECOMMENDED_FACTS: FactKey[] = ["permitNo", "building", "floor"];
export const ALL_FACTS: FactKey[] = [
  "purpose",
  "type",
  "zoneId",
  "building",
  "floor",
  "beds",
  "baths",
  "area",
  "price",
  "furnishing",
  "cheques",
  "view",
  "amenities",
  "maidRoom",
  "balcony",
  "permitNo",
];

export const factLabel: Record<FactKey, Bi> = {
  purpose: { en: "Purpose", ar: "الغرض" },
  type: { en: "Property type", ar: "نوع العقار" },
  zoneId: { en: "Area / zone", ar: "المنطقة" },
  building: { en: "Building / project", ar: "المبنى / المشروع" },
  beds: { en: "Bedrooms", ar: "غرف النوم" },
  baths: { en: "Bathrooms", ar: "الحمامات" },
  area: { en: "Size (sqm)", ar: "المساحة (م²)" },
  price: { en: "Price (QAR)", ar: "السعر (ر.ق)" },
  furnishing: { en: "Furnishing", ar: "التأثيث" },
  floor: { en: "Floor", ar: "الطابق" },
  view: { en: "View", ar: "الإطلالة" },
  amenities: { en: "Amenities", ar: "المرافق" },
  permitNo: { en: "Advertising permit no.", ar: "رقم ترخيص الإعلان" },
  maidRoom: { en: "Maid's room", ar: "غرفة خادمة" },
  balcony: { en: "Balcony", ar: "شرفة" },
  cheques: { en: "Cheques", ar: "عدد الشيكات" },
};

export const views: Record<string, Bi> = {
  sea: { en: "Sea view", ar: "إطلالة بحرية" },
  marina: { en: "Marina view", ar: "إطلالة على المارينا" },
  city: { en: "City view", ar: "إطلالة على المدينة" },
  canal: { en: "Canal view", ar: "إطلالة على القناة" },
};

const zoneAliases: Record<string, string[]> = {
  pearl: ["the pearl", "pearl", "porto arabia", "viva bahriya", "qanat quartier", "medina centrale", "abraj quartier", "اللؤلؤة", "اللؤلؤه", "بورتو أرابيا", "بورتو ارابيا"],
  lusail: ["lusail", "fox hills", "lusail marina", "لوسيل", "فوكس هيلز"],
  westbay: ["west bay", "westbay", "dafna", "الخليج الغربي", "الدفنة"],
  msheireb: ["msheireb", "مشيرب"],
  alsadd: ["al sadd", "alsadd", "السد"],
  alwaab: ["al waab", "alwaab", "الوعب"],
  alwakrah: ["al wakrah", "wakra", "الوكرة"],
  algharrafa: ["al gharrafa", "gharrafa", "الغرافة"],
  binmahmoud: ["bin mahmoud", "بن محمود"],
  oldairport: ["old airport", "المطار القديم"],
  alduhail: ["al duhail", "duhail", "الدحيل"],
  ainkhaled: ["ain khaled", "عين خالد"],
};

const amenityWords: Record<string, RegExp> = {
  pool: /\bpool\b|swimming|مسبح/i,
  gym: /\bgym\b|fitness|نادي رياضي|جيم/i,
  security: /security|guard|حراسة|أمن/i,
  elevator: /elevator|\blift\b|مصعد/i,
  central_ac: /central\s*a\/?c|central air|تكييف مركزي/i,
  beach: /beach|شاطئ/i,
  kids: /kids|play ?area|playground|ألعاب أطفال|العاب اطفال/i,
  concierge: /concierge|كونسيرج/i,
  garden: /garden|حديقة/i,
  sauna: /sauna|\bspa\b|ساونا/i,
  metro: /metro|tram|مترو|ترام/i,
  covered_parking: /covered parking|parking|موقف/i,
};

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/٫/g, ".").replace(/٬/g, ",");

function snippet(text: string, index: number, length: number) {
  const start = Math.max(0, index - 14);
  const end = Math.min(text.length, index + length + 14);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

function find(text: string, re: RegExp): RegExpExecArray | null {
  const r = new RegExp(re.source, re.flags.replace("g", ""));
  return r.exec(text);
}

const unitMultiplier = (u?: string) => {
  if (!u) return 1;
  const x = u.toLowerCase();
  if (x === "k" || x.includes("ألف") || x.includes("الف") || x.includes("آلاف")) return 1000;
  if (x === "m" || x.startsWith("million") || x.includes("مليون")) return 1_000_000;
  return 1;
};

export function parsePrice(text: string): { value: number; index: number; length: number } | null {
  const res = [
    /(?:qar|qr)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m|million)?(?![a-z²0-9])/i,
    /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m|million|ألف|الف|آلاف|مليون)(?![a-z²0-9])/i,
    /([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:qar|qr|ريال|ر\.ق)/i,
  ];
  for (const re of res) {
    const m = find(text, re);
    if (m) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      const value = Math.round(n * unitMultiplier(m[2]));
      if (value >= 500) return { value, index: m.index, length: m[0].length };
    }
  }
  return null;
}

export function extractFacts(raw: string): Facts {
  const text = toLatinDigits(raw);
  const lower = text.toLowerCase();
  const facts: Facts = {};
  const put = (key: FactKey, value: FactValue, m: { index: number; length: number }) => {
    facts[key] = { key, value, source: snippet(text, m.index, m.length), by: "ai" };
  };
  const at = (m: RegExpExecArray) => ({ index: m.index, length: m[0].length });

  // Purpose
  const sale = find(text, /\bfor sale\b|\bsale price\b|\bselling\b|\bfreehold\b|للبيع|تملك/i);
  const rent = find(text, /\bfor rent\b|\brent\b|\brental\b|per month|\/\s*month|\bmonthly\b|للإيجار|الإيجار|ايجار|إيجار|شهري/i);
  if (sale && (!rent || sale.index < rent.index)) put("purpose", "sale" satisfies Purpose, at(sale));
  else if (rent) put("purpose", "rent" satisfies Purpose, at(rent));

  // Type
  const types: [PropertyType, RegExp][] = [
    ["penthouse", /penthouse|بنتهاوس/i],
    ["townhouse", /townhouse|town house|تاون ?هاوس/i],
    ["villa", /\bvilla\b|فيلا|فله/i],
    ["studio", /\bstudio\b|استوديو|ستوديو/i],
    ["office", /\boffice\b|مكتب/i],
    ["apartment", /apartment|\bflat\b|\bapt\b|شقة|شقه/i],
  ];
  for (const [t, re] of types) {
    const m = find(text, re);
    if (m) {
      put("type", t, at(m));
      break;
    }
  }

  // Bedrooms
  const studio = find(text, /\bstudio\b|استوديو/i);
  const bedsM = find(text, /([0-9]{1,2})\s*-?\s*(?:br\b|b\/r\b|bhk\b|bed(?:room)?s?\b)/i) ?? find(text, /([0-9]{1,2})\s*غرف/);
  const twoAr = find(text, /غرفتين|غرفتي نوم/);
  if (bedsM) put("beds", parseInt(bedsM[1], 10), at(bedsM));
  else if (twoAr) put("beds", 2, at(twoAr));
  else if (studio) put("beds", 0, at(studio));

  // Bathrooms
  const bathsM = find(text, /([0-9]{1,2})\s*(?:full\s*)?(?:baths?|bathrooms?|wc)\b/i) ?? find(text, /([0-9]{1,2})\s*حمام/);
  const twoBathAr = find(text, /حمامين/);
  if (bathsM) put("baths", parseInt(bathsM[1], 10), at(bathsM));
  else if (twoBathAr) put("baths", 2, at(twoBathAr));

  // Area
  const areaM = find(text, /([0-9]{2,5})\s*(?:sqm|sq\.?\s?m\b|m2\b|m²|square met(?:re|er)s?|متر(?:\s*مربع)?|م²)/i);
  if (areaM) put("area", parseInt(areaM[1], 10), at(areaM));

  // Price
  const pr = parsePrice(text);
  if (pr) put("price", pr.value, pr);

  // Furnishing (most specific first)
  const semi = find(text, /semi[- ]?furnished|شبه مفروش/i);
  const unf = find(text, /unfurnished|non[- ]?furnished|غير مفروش/i);
  const furn = find(text, /furnished|مفروش/i);
  if (semi) put("furnishing", "semi" satisfies Furnishing, at(semi));
  else if (unf) put("furnishing", "unfurnished" satisfies Furnishing, at(unf));
  else if (furn) put("furnishing", "furnished" satisfies Furnishing, at(furn));

  // Zone (longest alias first so "lusail marina" beats "marina")
  const aliasList = zones.flatMap((z) => [...(zoneAliases[z.id] ?? []), z.name.en.toLowerCase(), z.name.ar].map((a) => ({ id: z.id, a })));
  aliasList.sort((x, y) => y.a.length - x.a.length);
  for (const { id, a } of aliasList) {
    const i = lower.indexOf(a.toLowerCase());
    if (i >= 0) {
      put("zoneId", id, { index: i, length: a.length });
      break;
    }
  }

  // Building / project
  const bld = find(text, /((?:[A-Z][A-Za-z]+\s+){1,3}Tower\s*[0-9]{1,3})/) ?? find(text, /(برج\s+[^\s،,.]+(?:\s+[^\s،,.]+)?\s*[0-9]{1,3})/);
  if (bld) put("building", bld[1].trim(), at(bld));

  // Floor
  const fl = find(text, /(?:floor|fl\.)\s*([0-9]{1,3})\b|([0-9]{1,3})(?:st|nd|rd|th)\s*floor|الطابق\s*([0-9]{1,3})/i);
  if (fl) put("floor", parseInt(fl[1] ?? fl[2] ?? fl[3], 10), at(fl));

  // View
  const vw: [string, RegExp][] = [
    ["sea", /sea[- ]?view|sea views|إطلالة بحرية|اطلالة بحرية|على البحر/i],
    ["marina", /marina view|على المارينا/i],
    ["canal", /canal view|على القناة/i],
    ["city", /city view|skyline|على المدينة/i],
  ];
  for (const [v, re] of vw) {
    const m = find(text, re);
    if (m) {
      put("view", v, at(m));
      break;
    }
  }

  // Amenities (each must be literally mentioned)
  const found: string[] = [];
  let firstAm: RegExpExecArray | null = null;
  for (const a of amenities) {
    const re = amenityWords[a.id];
    const m = re ? find(text, re) : null;
    if (m) {
      found.push(a.id);
      if (!firstAm || m.index < firstAm.index) firstAm = m;
    }
  }
  if (found.length && firstAm) {
    facts.amenities = { key: "amenities", value: found, source: snippet(text, firstAm.index, 60), by: "ai" };
  }

  // Permit number
  const pm = find(text, /(QA-RE-[0-9][0-9-]*)/i) ?? find(text, /permit(?:\s*(?:no\.?|number|#))?\s*[:#]?\s*([A-Z]{1,4}-[A-Z0-9-]{4,})/i) ?? find(text, /ترخيص\s*[:#]?\s*([A-Z0-9-]{5,})/i);
  if (pm) put("permitNo", pm[1].toUpperCase(), at(pm));

  const maid = find(text, /maid'?s? ?room|\bmaid\b|خادمة/i);
  if (maid) put("maidRoom", true, at(maid));
  const balc = find(text, /balcon|terrace|شرفة|بلكون/i);
  if (balc) put("balcony", true, at(balc));
  const chq = find(text, /([0-9]{1,2})\s*cheques?/i) ?? find(text, /([0-9]{1,2})\s*شيكات/);
  if (chq) put("cheques", parseInt(chq[1], 10), at(chq));

  return facts;
}

/**
 * Verifies a single fact against a quoted source span using the same rules.
 * Used to check LLM output: the model proposes, the deterministic parser must agree.
 */
export function verifyFact(key: FactKey, value: FactValue, quote: string, fullText: string): boolean {
  const q = toLatinDigits(quote).trim();
  if (!q) return false;
  const norm = (s: string) => toLatinDigits(s).toLowerCase().replace(/\s+/g, " ");
  if (!norm(fullText).includes(norm(q))) return false; // quote must exist verbatim
  const re = extractFacts(q)[key];
  if (key === "building") return norm(q).includes(norm(String(value)));
  if (key === "amenities") {
    const got = (re?.value as string[]) ?? [];
    return Array.isArray(value) && value.every((v) => got.includes(v));
  }
  return !!re && JSON.stringify(re.value) === JSON.stringify(value);
}

export function missingFacts(facts: Facts): FactKey[] {
  return REQUIRED_FACTS.filter((k) => facts[k] === undefined || facts[k]!.value === "" || Number.isNaN(facts[k]!.value));
}

// ---------- Sample intakes (the demo inputs) ----------

export const sampleText = {
  en: "Hi team 👋 new one for the site: Furnished 2BR in Porto Arabia Tower 12, The Pearl. Full sea view, 3 baths, 135 sqm, big balcony, pool + gym + beach access, 24/7 security. Rent 12.5k per month, 4 cheques. Owner prefers a family. Call Fatima on 5512 3344 for viewing.",
  ar: "شقة مفروشة غرفتين في اللؤلؤة، برج بورتو أرابيا 12، إطلالة بحرية، 3 حمامات، 135 متر مربع، شرفة، مسبح ونادي رياضي وحراسة على مدار الساعة. الإيجار 12500 ريال شهري على 4 شيكات.",
};

/** Simulated OCR output of an uploaded listing sheet (no real OCR runs in the prototype). */
export const sampleDocumentText =
  "TENANCY LISTING SHEET\nProperty: Villa in a gated compound, Al Waab\nBedrooms: 5 bedrooms + maid's room\nBathrooms: 6 bathrooms\nBuilt-up area: 450 sqm\nRent: QAR 22,000 per month, 12 cheques\nCondition: Unfurnished\nAmenities: shared pool, gym, kids play area, 24/7 security, covered parking\nAdvertising permit: QA-RE-2026-41190";

/** Simulated speech-to-text of an agent voice note. */
export const sampleVoiceText =
  "Salam, adding a 3-bedroom townhouse in Lusail Fox Hills, about 280 sqm, for sale at 3.1M, semi-furnished, with a private garden and a terrace.";
