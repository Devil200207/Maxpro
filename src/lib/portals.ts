import type { Bi } from "./i18n";

/**
 * Portal capability registry (HUB-02). Each external portal declares what it supports;
 * the Hub never assumes a capability that is not listed here.
 * Both portals are mock/sandbox connectors (HUB-11) — no real portal is contacted.
 */
export type PortalCapability = "create" | "update" | "unpublish" | "status" | "leads";

export interface PortalDef {
  id: string;
  name: Bi;
  short: string;
  mode: "mock" | "sandbox" | "live";
  color: string;
  capabilities: PortalCapability[];
  /** Fields the portal requires on top of the canonical record (HUB-04 deterministic validation). */
  requiredFields: string[];
  limits: { titleMax: number; minPhotos: number; maxPhotos: number; rateLimitPerMin: number };
  note: Bi;
}

export const portals: PortalDef[] = [
  {
    id: "portal-a",
    name: { en: "Portal A (mock)", ar: "البوابة أ (تجريبية)" },
    short: "A",
    mode: "mock",
    color: "#0ea5e9",
    capabilities: ["create", "update", "unpublish", "status", "leads"],
    requiredFields: ["titleEn", "titleAr", "price", "beds", "area", "zone", "photos"],
    limits: { titleMax: 90, minPhotos: 3, maxPhotos: 30, rateLimitPerMin: 60 },
    note: { en: "Full REST API: create, update, unpublish, status and lead retrieval.", ar: "واجهة API كاملة: إنشاء وتحديث وإلغاء نشر وحالة واسترجاع العملاء." },
  },
  {
    id: "portal-b",
    name: { en: "Portal B (mock)", ar: "البوابة ب (تجريبية)" },
    short: "B",
    mode: "mock",
    color: "#8b5cf6",
    capabilities: ["create", "update", "status"],
    requiredFields: ["titleEn", "price", "beds", "area", "zone", "photos", "permitNo", "floor"],
    limits: { titleMax: 70, minPhotos: 5, maxPhotos: 20, rateLimitPerMin: 20 },
    note: {
      en: "Publish-only XML feed: no unpublish and no lead retrieval. Requires permit number and floor; titles max 70 characters.",
      ar: "تغذية XML للنشر فقط: لا إلغاء نشر ولا استرجاع عملاء. يتطلب رقم الترخيص والطابق؛ العنوان 70 حرفاً كحد أقصى.",
    },
  },
];

export const portalById = (id: string) => portals.find((p) => p.id === id)!;
