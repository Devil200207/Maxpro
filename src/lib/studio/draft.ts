import { advertiserById, roomCatName, zoneById, type Listing, type Media, type RoomCat } from "../data";
import type { Bi } from "../i18n";
import { autoChecks } from "../moderation";
import type { Session } from "../store";
import type { StudioCopy } from "./content";
import { toSheet } from "./content";
import { REQUIRED_FACTS, factLabel, missingFacts, views, type FactKey, type Facts } from "./extract";

export type IntakeMethod = "text" | "document" | "voice";

export interface StudioPhoto {
  id: string;
  src: string;
  cat: RoomCat;
  tagged: "ai" | "user";
  /** AIS-07: enhanced or virtually staged photos must be disclosed. */
  enhanced: boolean;
  sample?: boolean;
  kb?: number;
}

export interface StudioDraft {
  step: number;
  method: IntakeMethod;
  source: string;
  sourceName?: string;
  engine?: string;
  engineNote?: string;
  dropped?: string[];
  facts: Facts;
  photos: StudioPhoto[];
  copy?: StudioCopy;
  checksRun: boolean;
  reviewed: boolean;
  listingId?: string;
}

export const emptyDraft = (): StudioDraft => ({ step: 0, method: "text", source: "", facts: {}, photos: [], checksRun: false, reviewed: false });

/** Required photo categories for the confirmed bedroom count (FR-LST-03). */
export function requiredPhotoCats(beds?: number): RoomCat[] {
  return ["exterior", "living", ...(beds && beds > 0 ? (["bedroom"] as RoomCat[]) : []), "bathroom", "kitchen"];
}

const pools = {
  aptExt: ["/img/ext-2.jpg", "/img/ext-4.jpg", "/img/ext-5.jpg", "/img/hero-tower.jpg"],
  villaExt: ["/img/ext-1.jpg", "/img/ext-6.jpg", "/img/ext-9.jpg", "/img/ext-14.jpg"],
  living: ["/img/liv-3.jpg", "/img/liv-9.jpg", "/img/liv-12.jpg"],
  kitchen: ["/img/kit-2.jpg", "/img/kit-5.jpg"],
  bedroom: ["/img/bed-2.jpg", "/img/bed-5.jpg", "/img/bed-7.jpg"],
  bathroom: ["/img/bath-2.jpg", "/img/bath-4.jpg"],
};

/** Demo photo set, already "tagged by AI" with the right room categories. */
export function samplePhotoSet(type: string | undefined, beds = 2): Omit<StudioPhoto, "id">[] {
  const ext = type === "villa" || type === "townhouse" ? pools.villaExt : pools.aptExt;
  const set: [string, RoomCat][] = [
    [ext[0], "exterior"],
    [pools.living[0], "living"],
    [pools.living[1], "living"],
    [pools.kitchen[0], "kitchen"],
    ...pools.bedroom.slice(0, Math.max(1, Math.min(beds, 3))).map((s) => [s, "bedroom"] as [string, RoomCat]),
    [pools.bathroom[0], "bathroom"],
  ];
  return set.map(([src, cat]) => ({ src, cat, tagged: "ai", enhanced: false, sample: true }));
}

/** Simulated AI room tagging for uploaded photos: fill uncovered required rooms first. */
export function guessRoom(existing: RoomCat[], beds?: number): RoomCat {
  const need = requiredPhotoCats(beds).find((c) => !existing.includes(c));
  return need ?? "other";
}

/** Resize to ≤1280px and re-encode as JPEG — re-encoding drops EXIF/GPS (FR-LST-03). */
export async function processUpload(file: File): Promise<{ src: string; kb: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const src = c.toDataURL("image/jpeg", 0.7);
  return { src, kb: Math.round((src.length * 3) / 4 / 1024) };
}

export const nextListingId = (all: Listing[]) => `AQ-${all.reduce((m, x) => Math.max(m, Number(x.id.replace("AQ-", "")) || 0), 0) + 1}`;

/** Canonical AqarPro record from the reviewed draft (FR-LST-12: portal versions are built separately). */
export function draftToListing(d: StudioDraft, id: string, session: Session, nowMs: number): Listing {
  const s = toSheet(d.facts);
  const adv = advertiserById(session.advertiserId);
  const z = zoneById(s.zoneId ?? "pearl");
  const copy = d.copy!;
  const created = new Date(nowMs).toISOString();
  const media: Media[] = d.photos.map((ph) => {
    const m: Media & { enhanced?: boolean } = { src: ph.src, cat: ph.cat };
    if (ph.enhanced) m.enhanced = true;
    return m;
  });
  return {
    id,
    orgId: adv.orgId,
    advertiserId: adv.id,
    purpose: s.purpose ?? "rent",
    type: s.type ?? "apartment",
    status: "pending",
    title: { en: copy.titleEn, ar: copy.titleAr },
    description: { en: copy.longEn, ar: copy.longAr },
    price: s.price ?? 0,
    negotiable: false,
    cheques: s.purpose === "rent" ? (s.cheques ?? 12) : undefined,
    deposit: s.purpose === "rent" ? s.price : undefined,
    commission: s.purpose === "rent" ? "50%" : "2%",
    utilitiesIncluded: false,
    beds: s.beds ?? 0,
    baths: s.baths ?? 1,
    area: s.area ?? 0,
    floor: s.floor,
    furnishing: s.furnishing ?? "unfurnished",
    parking: (s.beds ?? 0) >= 3 ? 2 : 1,
    view: s.view ? views[s.view] : undefined,
    maidRoom: s.maidRoom,
    balcony: s.balcony,
    pets: false,
    suitability: "any",
    zoneId: z.id,
    building: s.building ? { en: s.building, ar: s.building } : undefined,
    lat: z.lat + 0.0015,
    lng: z.lng - 0.0015,
    amenities: s.amenities,
    media,
    permitNo: s.permitNo,
    promotion: "none",
    createdAt: created,
    expiresAt: new Date(nowMs + 60 * 86400000).toISOString(),
    source: "manual",
    stats: { views: 0, saves: 0, enquiries: 0, waClicks: 0 },
    assignedAgentId: session.role === "agent" ? session.memberId : undefined,
    priceHistory: [{ at: created, price: s.price ?? 0 }],
    aiSuggestedFields: (Object.values(d.facts).filter((f) => f && f.by === "ai").map((f) => f!.key) as FactKey[]),
  };
}

export interface StudioCheck {
  id: string;
  level: "block" | "warn" | "info" | "ok";
  label: Bi;
  detail?: Bi;
}

const PHONE = /(\+?974[\s-]?)?\b[3-7]\d{3}[\s-]?\d{4}\b/;

/** AIS-03 quality checks: missing fields, inconsistencies, moderation auto-checks. */
export function studioChecks(d: StudioDraft, preview: Listing, all: Listing[]): StudioCheck[] {
  const out: StudioCheck[] = [];
  const s = toSheet(d.facts);
  for (const k of missingFacts(d.facts)) out.push({ id: `missing-${k}`, level: "block", label: { en: `Missing: ${factLabel[k].en}`, ar: `ناقص: ${factLabel[k].ar}` } });
  const unconfirmed = Object.values(d.facts).filter((f) => f && f.by === "ai");
  if (unconfirmed.length)
    out.push({
      id: "unconfirmed",
      level: "warn",
      label: { en: `${unconfirmed.length} AI-suggested fact(s) not yet confirmed`, ar: `${unconfirmed.length} معلومة مقترحة من الذكاء الاصطناعي لم تُؤكد بعد` },
      detail: { en: "They stay marked as AI-suggested on the listing until a person confirms them.", ar: "ستبقى معلّمة كمقترحة حتى يؤكدها شخص." },
    });
  if (!s.permitNo) out.push({ id: "permit", level: "warn", label: { en: "No advertising permit number", ar: "لا يوجد رقم ترخيص إعلان" }, detail: { en: "Required by some portals and by Qatar advertising rules (D-04).", ar: "مطلوب لبعض البوابات ووفق أنظمة الإعلان (D-04)." } });
  if (s.floor === undefined && s.type !== "villa") out.push({ id: "floor", level: "info", label: { en: "Floor not provided — some portals require it", ar: "الطابق غير محدد — بعض البوابات تتطلبه" } });

  const cats = d.photos.map((p) => p.cat);
  const missingCats = requiredPhotoCats(s.beds).filter((c) => !cats.includes(c));
  if (missingCats.length)
    out.push({ id: "photo-cats", level: "warn", label: { en: `Missing room photos: ${missingCats.map((c) => roomCatName[c].en.toLowerCase()).join(", ")}`, ar: `صور غرف ناقصة: ${missingCats.map((c) => roomCatName[c].ar).join("، ")}` } });
  const bedPhotos = cats.filter((c) => c === "bedroom").length;
  if (s.beds && s.beds > 1 && bedPhotos > 0 && bedPhotos < s.beds)
    out.push({ id: "bed-photos", level: "info", label: { en: `${s.beds} bedrooms but ${bedPhotos} bedroom photo(s)`, ar: `${s.beds} غرف نوم مقابل ${bedPhotos} صورة غرف` } });
  if (s.type === "studio" && s.beds) out.push({ id: "studio-beds", level: "warn", label: { en: "Type is studio but bedrooms > 0", ar: "النوع استوديو لكن عدد الغرف أكبر من صفر" } });
  if (s.baths !== undefined && s.beds !== undefined && s.baths > s.beds + 3) out.push({ id: "baths", level: "warn", label: { en: "Unusually many bathrooms for the bedroom count", ar: "عدد حمامات غير معتاد مقارنة بالغرف" } });

  if (PHONE.test(d.source) && !PHONE.test(`${preview.description.en} ${preview.description.ar}`))
    out.push({ id: "source-contact", level: "info", label: { en: "Phone number found in the source — kept out of the public text", ar: "رقم هاتف في المصدر — لم يُنسخ إلى النص العام" } });

  for (const c of autoChecks(preview, all)) {
    if (["permit", "photos", "clean"].includes(c.id)) continue;
    out.push({ id: `mod-${c.id}`, level: c.level === "block" ? "block" : "warn", label: c.label, detail: c.detail });
  }
  if (d.photos.some((p) => p.enhanced))
    out.push({ id: "enhanced", level: "info", label: { en: "Enhanced photos will carry a “Virtually enhanced” disclosure", ar: "الصور المحسّنة ستحمل إفصاح «محسّنة رقمياً»" } });
  if (!out.some((x) => x.level === "block" || x.level === "warn")) out.push({ id: "ok", level: "ok", label: { en: "Listing passes all quality checks", ar: "الإعلان اجتاز كل فحوصات الجودة" } });
  return out;
}

export { REQUIRED_FACTS };
