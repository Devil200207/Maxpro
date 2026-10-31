import { furnishingName, typeName, zoneById, type Listing } from "../data";
import type { Bi } from "../i18n";
import { portalById, type PortalDef } from "../portals";

/**
 * Portal Integration Hub core (HUB-01/04/08). Pure functions: canonical listing →
 * portal-specific payload, deterministic validation and idempotency keys.
 * Connectors never touch the canonical record; they only receive a payload.
 */

export interface HubIssue {
  field: string;
  message: Bi;
}

/** Fields a person can fix inline from the Hub (they update the canonical listing). */
export const FIXABLE_FIELDS = ["floor", "permitNo", "titleAr", "titleEn"] as const;
export type FixableField = (typeof FIXABLE_FIELDS)[number];

export const photoCount = (l: Listing) => l.media.filter((m) => m.cat !== "floorplan").length;

/** Shorten a title to a portal limit at a word boundary; prefer dropping the building name first. */
export function portalTitle(l: Listing, portal: PortalDef): { title: string; transformed: boolean } {
  const full = l.title.en.trim();
  if (full.length <= portal.limits.titleMax) return { title: full, transformed: false };
  let t = full;
  if (l.building?.en && t.includes(`${l.building.en}, `)) t = t.replace(`${l.building.en}, `, "");
  if (t.length <= portal.limits.titleMax) return { title: t, transformed: true };
  const cut = t.slice(0, portal.limits.titleMax - 1);
  return { title: `${cut.slice(0, cut.lastIndexOf(" "))}…`, transformed: true };
}

/** HUB-04 mapping/transform. Each connector gets its own shape. */
export function buildPayload(l: Listing, portalId: string): Record<string, unknown> {
  const portal = portalById(portalId);
  const { title } = portalTitle(l, portal);
  const photos = l.media.filter((m) => m.cat !== "floorplan").slice(0, portal.limits.maxPhotos);
  const zone = zoneById(l.zoneId);
  if (portalId === "portal-b") {
    // XML feed item
    return {
      RefNo: l.id,
      OfferingType: l.purpose === "rent" ? "RR" : "RS",
      Category: typeName(l.type).en,
      Title: title,
      Description: l.description.en,
      Price: l.price,
      Bedrooms: l.beds,
      Size: l.area,
      Community: zone.name.en,
      Floor: l.floor ?? null,
      PermitNumber: l.permitNo ?? null,
      Photos: photos.map((p) => p.src),
    };
  }
  return {
    reference: l.id,
    purpose: l.purpose,
    property_type: l.type,
    title: { en: title, ar: l.title.ar },
    description: { en: l.description.en, ar: l.description.ar },
    price_qar: l.price,
    bedrooms: l.beds,
    bathrooms: l.baths,
    size_sqm: l.area,
    furnishing: furnishingName[l.furnishing].en,
    location: { area: zone.name.en, building: l.building?.en ?? null, lat: l.lat, lng: l.lng },
    amenities: l.amenities,
    permit_number: l.permitNo ?? null,
    images: photos.map((p) => ({ url: p.src, room: p.cat })),
  };
}

/** HUB-04 deterministic validation against the portal's declared requirements. */
export function validateForPortal(l: Listing, portalId: string): HubIssue[] {
  const p = portalById(portalId);
  const issues: HubIssue[] = [];
  const req = new Set(p.requiredFields);
  const name = p.name;
  const need = (field: string, en: string, ar: string) =>
    issues.push({ field, message: { en: `${name.en} requires ${en}`, ar: `${name.ar} تتطلب ${ar}` } });
  if (req.has("titleEn") && !l.title.en.trim()) need("titleEn", "an English title", "عنواناً بالإنجليزية");
  if (req.has("titleAr") && !l.title.ar.trim()) need("titleAr", "an Arabic title", "عنواناً بالعربية");
  if (req.has("price") && !(l.price > 0)) need("price", "a price", "سعراً");
  if (req.has("beds") && typeof l.beds !== "number") need("beds", "the number of bedrooms", "عدد الغرف");
  if (req.has("area") && !(l.area > 0)) need("area", "the size", "المساحة");
  if (req.has("zone") && !l.zoneId) need("zone", "an area", "المنطقة");
  if (req.has("permitNo") && !l.permitNo) need("permitNo", "an advertising permit number", "رقم ترخيص الإعلان");
  if (req.has("floor") && (l.floor === undefined || l.floor === null)) need("floor", "a floor number", "رقم الطابق");
  if (req.has("photos")) {
    const n = photoCount(l);
    if (n < p.limits.minPhotos)
      issues.push({ field: "photos", message: { en: `${name.en} needs at least ${p.limits.minPhotos} photos (has ${n})`, ar: `${name.ar} تتطلب ${p.limits.minPhotos} صور على الأقل (الموجود ${n})` } });
  }
  return issues;
}

/** Stable short hash of a payload, used to decide whether a new payload version is needed. */
export function payloadHash(payload: Record<string, unknown>) {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** HUB-08: one key per listing × portal × payload version. Retries reuse it. */
export const idempotencyKey = (listingId: string, portalId: string, version: number) => `idem-${listingId}-${portalId}-v${version}`;

export const maskCredential = (ref: string) => ref.replace(/(vault:\/\/[^/]+\/)[^/]+/, "$1••••••");
