import { amenityName, furnishingName, typeName, zoneById, type Furnishing, type PropertyType, type Purpose } from "../data";
import type { Bi } from "../i18n";
import { views, type Facts } from "./extract";

/** Typed view of the facts a person has confirmed (only these feed the copy). */
export interface FactSheet {
  purpose?: Purpose;
  type?: PropertyType;
  zoneId?: string;
  building?: string;
  beds?: number;
  baths?: number;
  area?: number;
  price?: number;
  furnishing?: Furnishing;
  floor?: number;
  view?: string;
  amenities: string[];
  permitNo?: string;
  maidRoom: boolean;
  balcony: boolean;
  cheques?: number;
}

export function toSheet(f: Facts): FactSheet {
  const v = <T,>(k: keyof Facts) => f[k]?.value as T | undefined;
  return {
    purpose: v<Purpose>("purpose"),
    type: v<PropertyType>("type"),
    zoneId: v<string>("zoneId"),
    building: v<string>("building"),
    beds: v<number>("beds"),
    baths: v<number>("baths"),
    area: v<number>("area"),
    price: v<number>("price"),
    furnishing: v<Furnishing>("furnishing"),
    floor: v<number>("floor"),
    view: v<string>("view"),
    amenities: (v<string[]>("amenities") ?? []).filter(Boolean),
    permitNo: v<string>("permitNo"),
    maidRoom: !!v<boolean>("maidRoom"),
    balcony: !!v<boolean>("balcony"),
    cheques: v<number>("cheques"),
  };
}

export interface StudioCopy {
  titleEn: string;
  titleAr: string;
  shortEn: string;
  shortAr: string;
  longEn: string;
  longAr: string;
}

const bedsEn = (b?: number) => (b === undefined ? "" : b === 0 ? "Studio" : `${b}BR`);
const bedsAr = (b?: number) => (b === undefined ? "" : b === 0 ? "استوديو" : b === 1 ? "غرفة نوم" : b === 2 ? "غرفتين" : `${b} غرف`);

/**
 * Template-based bilingual copy (AIS-02). Uses only confirmed facts, so it can never
 * state a view, amenity or price that was not supplied (AIS-06).
 */
export function generateCopy(s: FactSheet, enhancedPhotos = false): StudioCopy {
  const t: Bi = s.type ? typeName(s.type) : { en: "property", ar: "عقار" };
  const z: Bi = s.zoneId ? zoneById(s.zoneId).name : { en: "Qatar", ar: "قطر" };
  const f: Bi | undefined = s.furnishing ? furnishingName[s.furnishing] : undefined;
  const v: Bi | undefined = s.view ? views[s.view] : undefined;
  const am = s.amenities.map((a) => amenityName(a));
  const purposeEn = s.purpose === "sale" ? "for sale" : s.purpose === "rent" ? "for rent" : "";
  const purposeAr = s.purpose === "sale" ? "للبيع" : s.purpose === "rent" ? "للإيجار" : "";

  const titleEn = [
    [f?.en, bedsEn(s.beds), t.en.toLowerCase()].filter(Boolean).join(" "),
    v ? `with ${v.en.toLowerCase()}` : "",
    `in ${s.building ? `${s.building}, ` : ""}${z.en}`,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
  const titleAr = [t.ar, f?.ar, bedsAr(s.beds), v ? `ب${v.ar}` : "", `في ${s.building ? `${s.building}، ` : ""}${z.ar}`].filter(Boolean).join(" ");

  const priceEn = s.price ? `QAR ${s.price.toLocaleString("en-US")}${s.purpose === "rent" ? " per month" : ""}` : "";
  const priceAr = s.price ? `${s.price.toLocaleString("en-US")} ر.ق${s.purpose === "rent" ? " شهرياً" : ""}` : "";

  const shortEn = [titleEn, priceEn].filter(Boolean).join(" · ");
  const shortAr = [titleAr, priceAr].filter(Boolean).join(" · ");

  const disclosureEn = enhancedPhotos ? " Some photos are virtually enhanced and are marked as such." : "";
  const disclosureAr = enhancedPhotos ? " بعض الصور محسّنة رقمياً ومُشار إليها." : "";

  const longEn = [
    `${[f?.en, s.beds === undefined ? "" : s.beds === 0 ? "studio" : `${s.beds}-bedroom`, t.en.toLowerCase()].filter(Boolean).join(" ").replace(/^./, (c) => c.toUpperCase())} ${purposeEn} in ${s.building ? `${s.building}, ` : ""}${z.en}${s.area ? `, ${s.area} sqm` : ""}${s.floor ? ` on floor ${s.floor}` : ""}.`,
    s.baths ? `${s.baths} bathrooms${s.maidRoom ? " plus a maid's room" : ""}.` : s.maidRoom ? "Includes a maid's room." : "",
    v ? `${v.en}${s.balcony ? " from a private balcony" : ""}.` : s.balcony ? "Private balcony." : "",
    am.length ? `Amenities: ${am.map((a) => a.en.toLowerCase()).join(", ")}.` : "",
    priceEn ? `${priceEn}${s.cheques ? `, payable by ${s.cheques} cheques` : ""}.` : "",
    s.permitNo ? `Advertising permit ${s.permitNo}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .concat(disclosureEn);

  const longAr = [
    `${t.ar}${f ? ` ${f.ar}` : ""}${s.beds === undefined ? "" : s.beds === 0 ? " بتصميم مفتوح" : s.beds === 1 ? " من غرفة نوم واحدة" : s.beds === 2 ? " من غرفتي نوم" : ` من ${s.beds} غرف نوم`} ${purposeAr} في ${s.building ? `${s.building}، ` : ""}${z.ar}${s.area ? `، بمساحة ${s.area} م²` : ""}${s.floor ? ` في الطابق ${s.floor}` : ""}.`,
    s.baths ? `${s.baths} حمامات${s.maidRoom ? " وغرفة خادمة" : ""}.` : s.maidRoom ? "تشمل غرفة خادمة." : "",
    v ? `${v.ar}${s.balcony ? " من شرفة خاصة" : ""}.` : s.balcony ? "شرفة خاصة." : "",
    am.length ? `المرافق: ${am.map((a) => a.ar).join("، ")}.` : "",
    priceAr ? `${priceAr}${s.cheques ? `، على ${s.cheques} شيكات` : ""}.` : "",
    s.permitNo ? `رقم ترخيص الإعلان ${s.permitNo}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .concat(disclosureAr);

  return { titleEn, titleAr, shortEn, shortAr, longEn, longAr };
}
