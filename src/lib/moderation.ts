import type { Bi } from "./i18n";
import type { Listing, RoomCat } from "./data";

export interface CheckResult {
  id: string;
  level: "block" | "warn" | "ok";
  label: Bi;
  detail?: Bi;
}

const REQUIRED_CATS: RoomCat[] = ["exterior", "living", "bedroom", "bathroom", "kitchen"];
const PROHIBITED = ["bachelors not allowed for", "no indians", "no asians", "only arabs", "only westerners", "لا للجنسية", "ممنوع جنسية"];

/** Median price per sqm for the same purpose + type, from live listings. */
function medianPpsm(all: Listing[], l: Listing) {
  const vals = all
    .filter((x) => x.id !== l.id && x.status === "live" && x.purpose === l.purpose && (x.type === l.type || x.zoneId === l.zoneId))
    .map((x) => x.price / x.area)
    .sort((a, b) => a - b);
  if (!vals.length) return undefined;
  return vals[Math.floor(vals.length / 2)];
}

/** FR-LST-05 automatic checks. Runs on submit and again in the moderator queue. */
export function autoChecks(l: Listing, all: Listing[]): CheckResult[] {
  const out: CheckResult[] = [];
  const text = `${l.title.en} ${l.title.ar} ${l.description.en} ${l.description.ar}`;

  const phone = /(\+?974[\s-]?)?\b[3-7]\d{3}[\s-]?\d{4}\b/.test(text);
  const email = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const wa = /whats\s?app|واتس/i.test(text);
  if (phone || email || wa)
    out.push({
      id: "contact",
      level: "block",
      label: { en: "Contact details in text", ar: "بيانات اتصال داخل النص" },
      detail: { en: "Phone numbers, emails and WhatsApp mentions must go through the platform so leads are tracked.", ar: "يجب أن تمر أرقام الهواتف والبريد وواتساب عبر المنصة لتتبع العملاء." },
    });

  const lower = text.toLowerCase();
  if (PROHIBITED.some((p) => lower.includes(p)))
    out.push({ id: "prohibited", level: "block", label: { en: "Discriminatory wording", ar: "صياغة تمييزية" } });

  const dup = all.find(
    (x) =>
      x.id !== l.id &&
      x.status === "live" &&
      x.advertiserId !== l.advertiserId &&
      x.title.en.trim().toLowerCase() === l.title.en.trim().toLowerCase(),
  );
  if (dup)
    out.push({
      id: "duplicate",
      level: "warn",
      label: { en: `Possible duplicate of ${dup.id}`, ar: `احتمال تكرار للإعلان ${dup.id}` },
      detail: { en: "Same title as a live listing from another advertiser.", ar: "نفس عنوان إعلان منشور من معلن آخر." },
    });

  const med = medianPpsm(all, l);
  if (med) {
    const ratio = l.price / l.area / med;
    if (ratio < 0.45 || ratio > 2.5)
      out.push({
        id: "price",
        level: "warn",
        label: { en: `Price outlier (${Math.round(ratio * 100)}% of market median)`, ar: `سعر غير معتاد (${Math.round(ratio * 100)}٪ من متوسط السوق)` },
      });
  }

  if (!l.permitNo)
    out.push({
      id: "permit",
      level: "warn",
      label: { en: "Missing advertising permit number", ar: "رقم ترخيص الإعلان مفقود" },
      detail: { en: "Configurable rule per D-04 (Qatar real-estate advertising fields).", ar: "قاعدة قابلة للضبط حسب القرار D-04." },
    });

  const cats = new Set(l.media.map((m) => m.cat));
  const missing = REQUIRED_CATS.filter((c) => !cats.has(c) && !(c === "bedroom" && l.beds === 0));
  if (missing.length)
    out.push({
      id: "photos",
      level: "warn",
      label: { en: `Missing photo categories: ${missing.join(", ")}`, ar: `فئات صور ناقصة: ${missing.length}` },
    });

  if (!out.length) out.push({ id: "clean", level: "ok", label: { en: "All automatic checks passed", ar: "اجتازت جميع الفحوصات التلقائية" } });
  return out;
}

export const rejectionReasons: { id: string; label: Bi }[] = [
  { id: "contact", label: { en: "Contact details in description", ar: "بيانات اتصال في الوصف" } },
  { id: "photos", label: { en: "Photos missing or not of the property", ar: "صور ناقصة أو لا تخص العقار" } },
  { id: "price", label: { en: "Price appears incorrect", ar: "السعر يبدو غير صحيح" } },
  { id: "duplicate", label: { en: "Duplicate listing", ar: "إعلان مكرر" } },
  { id: "permit", label: { en: "Missing or invalid permit number", ar: "رقم الترخيص مفقود أو غير صالح" } },
  { id: "discrimination", label: { en: "Discriminatory content", ar: "محتوى تمييزي" } },
];
