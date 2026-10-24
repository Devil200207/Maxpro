import type { Bi } from "./i18n";

// ---------- Types (mirror the principal entities in brief §9) ----------

export type Purpose = "rent" | "sale";
export type PropertyType = "apartment" | "villa" | "townhouse" | "penthouse" | "studio" | "office";
export type RoomCat = "exterior" | "living" | "bedroom" | "bathroom" | "kitchen" | "floorplan" | "other";
export type ListingStatus =
  | "draft"
  | "pending"
  | "live"
  | "paused"
  | "rejected"
  | "expired"
  | "sold"
  | "rented"
  | "archived";
export type Furnishing = "furnished" | "semi" | "unfurnished";
export type Source = "manual" | "bulk" | "api" | "erp";

export interface Media {
  src: string;
  cat: RoomCat;
}

export interface Listing {
  id: string;
  orgId: string; // WP-ERX-01: every record carries an organisation ID
  advertiserId: string;
  purpose: Purpose;
  type: PropertyType;
  status: ListingStatus;
  title: Bi;
  description: Bi;
  price: number;
  negotiable: boolean;
  cheques?: number;
  deposit?: number;
  commission?: string;
  utilitiesIncluded: boolean;
  beds: number;
  baths: number;
  area: number; // sqm
  floor?: number;
  furnishing: Furnishing;
  parking: number;
  view?: Bi;
  maidRoom: boolean;
  balcony: boolean;
  pets: boolean;
  suitability: "family" | "bachelor" | "any";
  zoneId: string;
  building?: Bi;
  lat: number;
  lng: number;
  amenities: string[];
  media: Media[];
  video?: string;
  tour360?: string;
  permitNo?: string;
  promotion: "none" | "featured" | "premium";
  createdAt: string;
  expiresAt: string;
  source: Source;
  stats: { views: number; saves: number; enquiries: number; waClicks: number };
}

export interface Zone {
  id: string;
  name: Bi;
  lat: number;
  lng: number;
}

export interface Advertiser {
  id: string;
  orgId: string;
  kind: "agency" | "individual";
  name: Bi;
  initials: string;
  color: string;
  phone: string;
  verified: boolean;
  licence?: string;
  planId: string;
  memberSince: string;
}

export interface Plan {
  id: string;
  name: Bi;
  tagline: Bi;
  monthly: number; // QAR; 0 = free, -1 = custom quote
  // WP-ERX-03: quotas, seats and entitlements live in data, never hard-coded
  quotas: { listings: number; featuredCredits: number; seats: number; bumpsPerMonth: number };
  features: Record<string, boolean>;
  highlight?: boolean;
}

export interface Poi {
  name: Bi;
  kind: "mall" | "metro" | "hospital" | "school" | "beach";
  lat: number;
  lng: number;
}

// ---------- Reference data ----------

export const zones: Zone[] = [
  { id: "pearl", name: { en: "The Pearl", ar: "اللؤلؤة" }, lat: 25.3705, lng: 51.5512 },
  { id: "lusail", name: { en: "Lusail", ar: "لوسيل" }, lat: 25.4175, lng: 51.4995 },
  { id: "westbay", name: { en: "West Bay", ar: "الخليج الغربي" }, lat: 25.3225, lng: 51.5305 },
  { id: "alsadd", name: { en: "Al Sadd", ar: "السد" }, lat: 25.2855, lng: 51.4985 },
  { id: "msheireb", name: { en: "Msheireb", ar: "مشيرب" }, lat: 25.2868, lng: 51.5262 },
  { id: "alwaab", name: { en: "Al Waab", ar: "الوعب" }, lat: 25.2625, lng: 51.4705 },
  { id: "alwakrah", name: { en: "Al Wakrah", ar: "الوكرة" }, lat: 25.1705, lng: 51.6005 },
  { id: "algharrafa", name: { en: "Al Gharrafa", ar: "الغرافة" }, lat: 25.3402, lng: 51.4503 },
  { id: "binmahmoud", name: { en: "Bin Mahmoud", ar: "بن محمود" }, lat: 25.2905, lng: 51.5105 },
  { id: "oldairport", name: { en: "Old Airport", ar: "المطار القديم" }, lat: 25.2505, lng: 51.5552 },
  { id: "alduhail", name: { en: "Al Duhail", ar: "الدحيل" }, lat: 25.3552, lng: 51.4655 },
  { id: "ainkhaled", name: { en: "Ain Khaled", ar: "عين خالد" }, lat: 25.2205, lng: 51.4602 },
];

export const zoneById = (id: string) => zones.find((z) => z.id === id)!;

export const propertyTypes: { id: PropertyType; name: Bi }[] = [
  { id: "apartment", name: { en: "Apartment", ar: "شقة" } },
  { id: "villa", name: { en: "Villa", ar: "فيلا" } },
  { id: "townhouse", name: { en: "Townhouse", ar: "تاون هاوس" } },
  { id: "penthouse", name: { en: "Penthouse", ar: "بنتهاوس" } },
  { id: "studio", name: { en: "Studio", ar: "استوديو" } },
  { id: "office", name: { en: "Office", ar: "مكتب" } },
];

export const typeName = (t: PropertyType) => propertyTypes.find((p) => p.id === t)!.name;

export const furnishingName: Record<Furnishing, Bi> = {
  furnished: { en: "Furnished", ar: "مفروشة" },
  semi: { en: "Semi-furnished", ar: "شبه مفروشة" },
  unfurnished: { en: "Unfurnished", ar: "غير مفروشة" },
};

export const roomCatName: Record<RoomCat, Bi> = {
  exterior: { en: "Exterior", ar: "الواجهة" },
  living: { en: "Living room", ar: "غرفة المعيشة" },
  bedroom: { en: "Bedroom", ar: "غرفة النوم" },
  bathroom: { en: "Bathroom", ar: "الحمام" },
  kitchen: { en: "Kitchen", ar: "المطبخ" },
  floorplan: { en: "Floor plan", ar: "المخطط" },
  other: { en: "Other", ar: "أخرى" },
};

export const amenities: { id: string; name: Bi }[] = [
  { id: "pool", name: { en: "Swimming pool", ar: "مسبح" } },
  { id: "gym", name: { en: "Gym", ar: "نادي رياضي" } },
  { id: "security", name: { en: "24/7 security", ar: "حراسة على مدار الساعة" } },
  { id: "elevator", name: { en: "Elevator", ar: "مصعد" } },
  { id: "central_ac", name: { en: "Central A/C", ar: "تكييف مركزي" } },
  { id: "beach", name: { en: "Beach access", ar: "وصول للشاطئ" } },
  { id: "kids", name: { en: "Kids play area", ar: "منطقة ألعاب أطفال" } },
  { id: "concierge", name: { en: "Concierge", ar: "خدمة الكونسيرج" } },
  { id: "garden", name: { en: "Private garden", ar: "حديقة خاصة" } },
  { id: "sauna", name: { en: "Sauna & spa", ar: "ساونا وسبا" } },
  { id: "metro", name: { en: "Near metro", ar: "قريب من المترو" } },
  { id: "covered_parking", name: { en: "Covered parking", ar: "موقف مظلل" } },
];

export const amenityName = (id: string) => amenities.find((a) => a.id === id)?.name ?? { en: id, ar: id };

export const pois: Poi[] = [
  { name: { en: "Place Vendôme Mall", ar: "مول بلاس فاندوم" }, kind: "mall", lat: 25.4212, lng: 51.4928 },
  { name: { en: "City Center Doha", ar: "سيتي سنتر الدوحة" }, kind: "mall", lat: 25.3262, lng: 51.5312 },
  { name: { en: "Villaggio Mall", ar: "فيلاجيو مول" }, kind: "mall", lat: 25.2602, lng: 51.4442 },
  { name: { en: "Doha Festival City", ar: "دوحة فستيفال سيتي" }, kind: "mall", lat: 25.385, lng: 51.438 },
  { name: { en: "Porto Arabia", ar: "بورتو أرابيا" }, kind: "beach", lat: 25.3718, lng: 51.5528 },
  { name: { en: "DECC Metro", ar: "مترو مركز المعارض" }, kind: "metro", lat: 25.3205, lng: 51.5282 },
  { name: { en: "Msheireb Metro", ar: "مترو مشيرب" }, kind: "metro", lat: 25.2865, lng: 51.5267 },
  { name: { en: "Al Sadd Metro", ar: "مترو السد" }, kind: "metro", lat: 25.2849, lng: 51.4976 },
  { name: { en: "Lusail QNB Metro", ar: "مترو لوسيل" }, kind: "metro", lat: 25.4105, lng: 51.5078 },
  { name: { en: "Hamad General Hospital", ar: "مستشفى حمد العام" }, kind: "hospital", lat: 25.2922, lng: 51.5022 },
  { name: { en: "Sidra Medicine", ar: "سدرة للطب" }, kind: "hospital", lat: 25.315, lng: 51.438 },
  { name: { en: "Al Wakra Hospital", ar: "مستشفى الوكرة" }, kind: "hospital", lat: 25.1785, lng: 51.5935 },
  { name: { en: "Qatar Academy Doha", ar: "أكاديمية قطر" }, kind: "school", lat: 25.3152, lng: 51.4402 },
  { name: { en: "Doha British School", ar: "مدرسة الدوحة البريطانية" }, kind: "school", lat: 25.2462, lng: 51.4822 },
  { name: { en: "Al Wakrah Beach", ar: "شاطئ الوكرة" }, kind: "beach", lat: 25.1625, lng: 51.6125 },
];

export const advertisers: Advertiser[] = [
  { id: "adv-pearlgate", orgId: "org-pearlgate", kind: "agency", name: { en: "Pearl Gate Realty", ar: "بيرل جيت العقارية" }, initials: "PG", color: "#0f766e", phone: "+974 4400 1122", verified: true, licence: "RE-2021-0457", planId: "agency", memberSince: "2025-03-01" },
  { id: "adv-lusailhomes", orgId: "org-lusailhomes", kind: "agency", name: { en: "Lusail Homes", ar: "لوسيل هومز" }, initials: "LH", color: "#1d4ed8", phone: "+974 4455 8800", verified: true, licence: "RE-2022-1190", planId: "agency", memberSince: "2025-06-12" },
  { id: "adv-dohaprime", orgId: "org-dohaprime", kind: "agency", name: { en: "Doha Prime Properties", ar: "الدوحة برايم للعقارات" }, initials: "DP", color: "#7c3aed", phone: "+974 4433 2299", verified: true, licence: "RE-2019-0088", planId: "enterprise", memberSince: "2025-01-20" },
  { id: "adv-ahmed", orgId: "org-ahmed", kind: "individual", name: { en: "Ahmed Al-Kuwari", ar: "أحمد الكواري" }, initials: "AK", color: "#b45309", phone: "+974 5512 3456", verified: true, planId: "professional", memberSince: "2025-08-03" },
  { id: "adv-sara", orgId: "org-sara", kind: "individual", name: { en: "Sara Mansour (Broker)", ar: "سارة منصور (وسيط)" }, initials: "SM", color: "#be185d", phone: "+974 5566 7788", verified: true, licence: "BR-2023-3321", planId: "professional", memberSince: "2025-09-15" },
  { id: "adv-omar", orgId: "org-omar", kind: "individual", name: { en: "Omar Haddad", ar: "عمر حداد" }, initials: "OH", color: "#475569", phone: "+974 5590 1020", verified: false, planId: "starter", memberSince: "2026-10-20" },
  { id: "adv-gulfkey", orgId: "org-gulfkey", kind: "agency", name: { en: "Gulf Key Realty", ar: "جلف كي العقارية" }, initials: "GK", color: "#0369a1", phone: "+974 4410 5050", verified: false, licence: "RE-2026-2210", planId: "professional", memberSince: "2026-10-18" },
];

export const advertiserById = (id: string) => advertisers.find((a) => a.id === id)!;

/** The advertiser the demo "logs in" as in the advertiser portal. */
export const DEMO_ADVERTISER_ID = "adv-pearlgate";

export const plans: Plan[] = [
  {
    id: "starter",
    name: { en: "Starter", ar: "المبتدئ" },
    tagline: { en: "For owners listing one or two properties", ar: "للملاك الذين يعرضون عقاراً أو اثنين" },
    monthly: 0,
    quotas: { listings: 2, featuredCredits: 0, seats: 1, bumpsPerMonth: 0 },
    features: { whatsappLeads: true, analytics: false, verifiedBadge: true, bulkUpload: false, metaCampaigns: false, aiAssistant: true, brandedPage: false, apiAccess: false },
  },
  {
    id: "professional",
    name: { en: "Professional", ar: "الاحترافي" },
    tagline: { en: "For brokers and active landlords", ar: "للوسطاء والملاك النشطين" },
    monthly: 499,
    quotas: { listings: 25, featuredCredits: 5, seats: 1, bumpsPerMonth: 20 },
    features: { whatsappLeads: true, analytics: true, verifiedBadge: true, bulkUpload: false, metaCampaigns: true, aiAssistant: true, brandedPage: false, apiAccess: false },
  },
  {
    id: "agency",
    name: { en: "Agency", ar: "الوكالة" },
    tagline: { en: "Teams, shared inventory and a branded page", ar: "فرق عمل ومخزون مشترك وصفحة باسم الوكالة" },
    monthly: 1999,
    quotas: { listings: 150, featuredCredits: 30, seats: 10, bumpsPerMonth: 150 },
    features: { whatsappLeads: true, analytics: true, verifiedBadge: true, bulkUpload: true, metaCampaigns: true, aiAssistant: true, brandedPage: true, apiAccess: false },
    highlight: true,
  },
  {
    id: "enterprise",
    name: { en: "Enterprise", ar: "المؤسسات" },
    tagline: { en: "Developers and large portfolios, API and ERP feeds", ar: "للمطورين والمحافظ الكبيرة مع ربط API و ERP" },
    monthly: -1,
    quotas: { listings: 1000, featuredCredits: 100, seats: 50, bumpsPerMonth: 1000 },
    features: { whatsappLeads: true, analytics: true, verifiedBadge: true, bulkUpload: true, metaCampaigns: true, aiAssistant: true, brandedPage: true, apiAccess: true },
  },
];

export const planById = (id: string) => plans.find((p) => p.id === id)!;

export const planFeatureNames: Record<string, Bi> = {
  whatsappLeads: { en: "WhatsApp lead routing", ar: "توجيه العملاء عبر واتساب" },
  analytics: { en: "Listing analytics", ar: "إحصاءات الإعلانات" },
  verifiedBadge: { en: "Verified badge", ar: "شارة التوثيق" },
  bulkUpload: { en: "Bulk upload (CSV / Excel)", ar: "رفع جماعي (CSV / Excel)" },
  metaCampaigns: { en: "Meta campaign tools", ar: "أدوات حملات ميتا" },
  aiAssistant: { en: "AI assistant leads", ar: "عملاء من المساعد الذكي" },
  brandedPage: { en: "Branded agency page", ar: "صفحة وكالة بعلامتك" },
  apiAccess: { en: "Listing API & ERP feed", ar: "واجهة API وربط ERP" },
};

// ---------- Listings ----------

const pools = {
  aptExt: ["/img/ext-2.jpg", "/img/ext-4.jpg", "/img/ext-5.jpg", "/img/ext-13.jpg", "/img/hero-tower.jpg"],
  villaExt: ["/img/ext-1.jpg", "/img/ext-3.jpg", "/img/ext-6.jpg", "/img/ext-7.jpg", "/img/ext-8.jpg", "/img/ext-9.jpg", "/img/ext-10.jpg", "/img/ext-11.jpg", "/img/ext-12.jpg", "/img/ext-14.jpg", "/img/ext-15.jpg", "/img/ext-16.jpg"],
  living: Array.from({ length: 17 }, (_, i) => `/img/liv-${i + 1}.jpg`),
  kitchen: Array.from({ length: 6 }, (_, i) => `/img/kit-${i + 1}.jpg`),
  bedroom: Array.from({ length: 8 }, (_, i) => `/img/bed-${i + 1}.jpg`),
  bathroom: Array.from({ length: 5 }, (_, i) => `/img/bath-${i + 1}.jpg`),
};

const at = <T,>(arr: T[], i: number) => arr[i % arr.length];

function gallery(n: number, type: PropertyType, beds: number): Media[] {
  const ext = type === "villa" || type === "townhouse" ? pools.villaExt : pools.aptExt;
  const m: Media[] = [
    { src: at(ext, n), cat: "exterior" },
    { src: at(pools.living, n), cat: "living" },
    { src: at(pools.living, n + 7), cat: "living" },
    { src: at(pools.kitchen, n), cat: "kitchen" },
  ];
  for (let b = 0; b < Math.max(1, Math.min(beds, 3)); b++) m.push({ src: at(pools.bedroom, n + b * 3), cat: "bedroom" });
  m.push({ src: at(pools.bathroom, n), cat: "bathroom" });
  if (type === "villa" || type === "townhouse") m.push({ src: at(pools.villaExt, n + 5), cat: "exterior" });
  m.push({ src: "/img/floorplan.svg", cat: "floorplan" });
  return m;
}

function stats(n: number) {
  const v = 300 + ((n * 7919) % 2400);
  return { views: v, saves: Math.round(v * 0.06), enquiries: Math.round(v * 0.025), waClicks: Math.round(v * 0.045) };
}

function describe(o: Seed): Bi {
  const z = zoneById(o.zone).name;
  const t = typeName(o.type);
  const f = furnishingName[o.furnishing];
  const bedsEn = o.beds === 0 ? "open-plan" : `${o.beds}-bedroom`;
  const bedsAr = o.beds === 0 ? "بتصميم مفتوح" : `من ${o.beds} غرف نوم`;
  const am = o.amenities.slice(0, 3).map((a) => amenityName(a));
  return {
    en: `${f.en} ${bedsEn} ${t.en.toLowerCase()} in ${z.en} with ${o.area} sqm of living space${o.view ? ` and ${o.view.en.toLowerCase()}` : ""}. ${o.extra?.en ?? ""} Residents enjoy ${am.map((a) => a.en.toLowerCase()).join(", ")}. ${o.purpose === "rent" ? `Rent is payable by ${o.cheques ?? 12} cheques${o.utilities ? ", utilities included" : ""}.` : "Freehold title available to all nationalities where permitted."}`.replace(/\s+/g, " ").trim(),
    ar: `${t.ar} ${f.ar} ${bedsAr} في ${z.ar} بمساحة ${o.area} متر مربع${o.view ? ` مع ${o.view.ar}` : ""}. ${o.extra?.ar ?? ""} يستمتع السكان بـ ${am.map((a) => a.ar).join("، ")}. ${o.purpose === "rent" ? `الإيجار على ${o.cheques ?? 12} شيكات${o.utilities ? "، شامل الخدمات" : ""}.` : "تملك حر متاح وفق الأنظمة."}`.replace(/\s+/g, " ").trim(),
  };
}

interface Seed {
  id: string;
  adv: string;
  purpose: Purpose;
  type: PropertyType;
  zone: string;
  beds: number;
  baths: number;
  area: number;
  price: number;
  furnishing: Furnishing;
  title: Bi;
  amenities: string[];
  view?: Bi;
  building?: Bi;
  promotion?: Listing["promotion"];
  status?: ListingStatus;
  cheques?: number;
  utilities?: boolean;
  maid?: boolean;
  pets?: boolean;
  suitability?: Listing["suitability"];
  floor?: number;
  permit?: string | null;
  daysAgo: number;
  extra?: Bi;
  descOverride?: Bi;
  jitter?: [number, number];
  source?: Source;
}

const seeds: Seed[] = [
  { id: "MP-10231", adv: "adv-pearlgate", purpose: "rent", type: "apartment", zone: "pearl", beds: 2, baths: 3, area: 135, price: 12500, furnishing: "furnished", title: { en: "Sea-view 2BR in Porto Arabia, fully furnished", ar: "شقة غرفتين بإطلالة بحرية في بورتو أرابيا، مفروشة بالكامل" }, amenities: ["pool", "gym", "beach", "security", "concierge", "central_ac"], view: { en: "Full sea view", ar: "إطلالة بحرية كاملة" }, building: { en: "Porto Arabia Tower 12", ar: "برج بورتو أرابيا 12" }, promotion: "premium", floor: 14, daysAgo: 2, utilities: true, extra: { en: "Wraparound balcony overlooking the marina and yachts.", ar: "شرفة واسعة تطل على المارينا واليخوت." } },
  { id: "MP-10232", adv: "adv-lusailhomes", purpose: "rent", type: "apartment", zone: "lusail", beds: 1, baths: 2, area: 85, price: 7200, furnishing: "semi", title: { en: "Modern 1BR at Lusail Marina, near tram", ar: "شقة غرفة نوم حديثة في مارينا لوسيل قرب الترام" }, amenities: ["pool", "gym", "metro", "elevator", "central_ac"], view: { en: "Marina view", ar: "إطلالة على المارينا" }, floor: 9, daysAgo: 4 },
  { id: "MP-10233", adv: "adv-pearlgate", purpose: "sale", type: "apartment", zone: "pearl", beds: 3, baths: 4, area: 210, price: 3450000, furnishing: "unfurnished", title: { en: "Freehold 3BR + maid in Viva Bahriya", ar: "شقة تملك حر 3 غرف + غرفة خادمة في فيفا بحرية" }, amenities: ["pool", "gym", "beach", "security", "kids", "central_ac"], view: { en: "Beach view", ar: "إطلالة على الشاطئ" }, building: { en: "Viva Bahriya Tower 21", ar: "فيفا بحرية برج 21" }, promotion: "featured", maid: true, floor: 7, daysAgo: 6 },
  { id: "MP-10234", adv: "adv-dohaprime", purpose: "rent", type: "villa", zone: "alwaab", beds: 5, baths: 6, area: 450, price: 22000, furnishing: "unfurnished", title: { en: "Compound villa 5BR with shared pool, Al Waab", ar: "فيلا 5 غرف في كمباوند مع مسبح مشترك، الوعب" }, amenities: ["pool", "gym", "security", "kids", "garden", "covered_parking"], promotion: "featured", maid: true, pets: true, suitability: "family", daysAgo: 3, extra: { en: "Gated compound minutes from Villaggio and Aspire Park.", ar: "كمباوند مسور على بعد دقائق من فيلاجيو وحديقة أسباير." } },
  { id: "MP-10235", adv: "adv-dohaprime", purpose: "rent", type: "apartment", zone: "westbay", beds: 2, baths: 2, area: 120, price: 10500, furnishing: "furnished", title: { en: "Furnished 2BR in West Bay tower, bills included", ar: "شقة غرفتين مفروشة في برج بالخليج الغربي شاملة الفواتير" }, amenities: ["pool", "gym", "metro", "security", "elevator", "central_ac"], view: { en: "City skyline view", ar: "إطلالة على أبراج المدينة" }, utilities: true, floor: 22, daysAgo: 1 },
  { id: "MP-10236", adv: "adv-sara", purpose: "rent", type: "studio", zone: "alsadd", beds: 0, baths: 1, area: 45, price: 4300, furnishing: "furnished", title: { en: "Cosy furnished studio next to Al Sadd Metro", ar: "استوديو مفروش بجوار مترو السد" }, amenities: ["metro", "elevator", "central_ac", "security"], suitability: "bachelor", utilities: true, floor: 4, daysAgo: 8 },
  { id: "MP-10237", adv: "adv-lusailhomes", purpose: "sale", type: "villa", zone: "lusail", beds: 6, baths: 7, area: 520, price: 7800000, furnishing: "unfurnished", title: { en: "Standalone 6BR villa with private pool, Fox Hills", ar: "فيلا مستقلة 6 غرف بمسبح خاص، فوكس هيلز" }, amenities: ["pool", "garden", "security", "covered_parking", "central_ac"], promotion: "featured", maid: true, suitability: "family", daysAgo: 5, jitter: [0.012, -0.01] },
  { id: "MP-10238", adv: "adv-ahmed", purpose: "rent", type: "apartment", zone: "binmahmoud", beds: 2, baths: 2, area: 110, price: 6800, furnishing: "semi", title: { en: "Owner direct: 2BR in Bin Mahmoud, no commission", ar: "من المالك مباشرة: شقة غرفتين في بن محمود بدون عمولة" }, amenities: ["elevator", "central_ac", "covered_parking"], suitability: "family", daysAgo: 2, floor: 3 },
  { id: "MP-10239", adv: "adv-ahmed", purpose: "rent", type: "villa", zone: "alwakrah", beds: 4, baths: 5, area: 380, price: 13500, furnishing: "unfurnished", title: { en: "Spacious 4BR villa near Al Wakrah beach", ar: "فيلا واسعة 4 غرف قرب شاطئ الوكرة" }, amenities: ["garden", "covered_parking", "central_ac"], maid: true, pets: true, suitability: "family", daysAgo: 9 },
  { id: "MP-10240", adv: "adv-dohaprime", purpose: "rent", type: "apartment", zone: "msheireb", beds: 1, baths: 2, area: 90, price: 9200, furnishing: "furnished", title: { en: "Designer 1BR in Msheireb Downtown", ar: "شقة غرفة نوم بتصميم راقٍ في مشيرب داون تاون" }, amenities: ["gym", "metro", "concierge", "security", "central_ac"], floor: 6, daysAgo: 1, utilities: true },
  { id: "MP-10241", adv: "adv-pearlgate", purpose: "rent", type: "townhouse", zone: "pearl", beds: 3, baths: 4, area: 260, price: 19000, furnishing: "semi", title: { en: "3BR townhouse with private beach, Qanat Quartier", ar: "تاون هاوس 3 غرف مع شاطئ خاص، قناة كوارتييه" }, amenities: ["beach", "pool", "security", "garden", "central_ac"], view: { en: "Canal view", ar: "إطلالة على القناة" }, maid: true, daysAgo: 7, jitter: [-0.004, -0.006] },
  { id: "MP-10242", adv: "adv-dohaprime", purpose: "rent", type: "villa", zone: "algharrafa", beds: 4, baths: 5, area: 400, price: 16500, furnishing: "unfurnished", title: { en: "4BR compound villa in Al Gharrafa, family friendly", ar: "فيلا 4 غرف في كمباوند بالغرافة، مناسبة للعائلات" }, amenities: ["pool", "gym", "kids", "security", "covered_parking"], suitability: "family", maid: true, daysAgo: 10 },
  { id: "MP-10243", adv: "adv-lusailhomes", purpose: "sale", type: "apartment", zone: "lusail", beds: 2, baths: 3, area: 140, price: 1650000, furnishing: "unfurnished", title: { en: "Freehold 2BR in Lusail Marina, payment plan", ar: "شقة تملك حر غرفتين في مارينا لوسيل مع خطة سداد" }, amenities: ["pool", "gym", "metro", "elevator"], view: { en: "Partial sea view", ar: "إطلالة جزئية على البحر" }, floor: 18, daysAgo: 12, jitter: [-0.012, 0.018] },
  { id: "MP-10244", adv: "adv-pearlgate", purpose: "rent", type: "penthouse", zone: "westbay", beds: 4, baths: 5, area: 380, price: 38000, furnishing: "furnished", title: { en: "Luxury 4BR penthouse with private terrace, West Bay", ar: "بنتهاوس فاخر 4 غرف بتراس خاص، الخليج الغربي" }, amenities: ["pool", "gym", "concierge", "sauna", "security", "central_ac"], view: { en: "Panoramic sea and city view", ar: "إطلالة بانورامية على البحر والمدينة" }, promotion: "premium", floor: 41, daysAgo: 2, maid: true, jitter: [0.004, 0.003] },
  { id: "MP-10245", adv: "adv-sara", purpose: "rent", type: "apartment", zone: "alduhail", beds: 3, baths: 3, area: 160, price: 8500, furnishing: "unfurnished", title: { en: "Family 3BR in Al Duhail with balcony", ar: "شقة عائلية 3 غرف في الدحيل مع شرفة" }, amenities: ["elevator", "central_ac", "covered_parking", "kids"], suitability: "family", floor: 2, daysAgo: 11 },
  { id: "MP-10246", adv: "adv-sara", purpose: "rent", type: "apartment", zone: "oldairport", beds: 2, baths: 2, area: 105, price: 5900, furnishing: "unfurnished", title: { en: "Affordable 2BR in Old Airport, close to schools", ar: "شقة غرفتين بسعر مناسب في المطار القديم قرب المدارس" }, amenities: ["elevator", "central_ac"], suitability: "any", floor: 5, daysAgo: 13 },
  { id: "MP-10247", adv: "adv-dohaprime", purpose: "sale", type: "villa", zone: "alwaab", beds: 5, baths: 6, area: 500, price: 5200000, furnishing: "unfurnished", title: { en: "5BR standalone villa for sale in Al Waab", ar: "فيلا مستقلة 5 غرف للبيع في الوعب" }, amenities: ["garden", "covered_parking", "central_ac", "security"], maid: true, suitability: "family", daysAgo: 15, jitter: [0.006, 0.01] },
  { id: "MP-10248", adv: "adv-lusailhomes", purpose: "rent", type: "apartment", zone: "lusail", beds: 3, baths: 4, area: 175, price: 11000, furnishing: "semi", title: { en: "3BR in Fox Hills with community park", ar: "شقة 3 غرف في فوكس هيلز مع حديقة مجتمعية" }, amenities: ["pool", "gym", "kids", "elevator", "central_ac"], suitability: "family", floor: 5, daysAgo: 3, jitter: [0.01, -0.012] },
  { id: "MP-10249", adv: "adv-ahmed", purpose: "rent", type: "villa", zone: "ainkhaled", beds: 6, baths: 7, area: 600, price: 20000, furnishing: "unfurnished", title: { en: "Large 6BR villa with majlis, Ain Khaled", ar: "فيلا كبيرة 6 غرف مع مجلس، عين خالد" }, amenities: ["garden", "covered_parking", "central_ac"], maid: true, suitability: "family", daysAgo: 6, extra: { en: "Separate majlis with its own entrance.", ar: "مجلس منفصل بمدخل خاص." } },
  { id: "MP-10250", adv: "adv-dohaprime", purpose: "rent", type: "office", zone: "westbay", beds: 0, baths: 2, area: 180, price: 27000, furnishing: "furnished", title: { en: "Fitted office space in West Bay, 180 sqm", ar: "مكتب مجهز في الخليج الغربي، 180 متر مربع" }, amenities: ["metro", "security", "elevator", "central_ac", "covered_parking"], suitability: "any", floor: 28, daysAgo: 4, jitter: [-0.005, 0.004] },
  { id: "MP-10251", adv: "adv-pearlgate", purpose: "rent", type: "apartment", zone: "pearl", beds: 1, baths: 2, area: 95, price: 8800, furnishing: "furnished", title: { en: "Furnished 1BR in Medina Centrale, bills included", ar: "شقة غرفة نوم مفروشة في المدينة سنترال شاملة الفواتير" }, amenities: ["pool", "gym", "security", "central_ac", "elevator"], utilities: true, floor: 3, daysAgo: 1, jitter: [-0.006, 0.004] },
  { id: "MP-10252", adv: "adv-lusailhomes", purpose: "sale", type: "townhouse", zone: "lusail", beds: 3, baths: 4, area: 280, price: 3100000, furnishing: "unfurnished", title: { en: "3BR townhouse in Lusail Waterfront, off-plan handover 2027", ar: "تاون هاوس 3 غرف في واجهة لوسيل البحرية، تسليم 2027" }, amenities: ["pool", "security", "garden", "kids"], suitability: "family", daysAgo: 14, jitter: [-0.008, 0.012] },
  // Moderation queue seeds (pending, with deliberate issues for auto-checks)
  { id: "MP-10253", adv: "adv-omar", purpose: "rent", type: "apartment", zone: "alsadd", beds: 2, baths: 2, area: 115, price: 2500, furnishing: "furnished", title: { en: "2BR furnished Al Sadd URGENT cheap", ar: "شقة غرفتين مفروشة السد عاجل رخيص" }, amenities: ["elevator"], status: "pending", daysAgo: 0, permit: null, descOverride: { en: "Very cheap furnished 2BR in Al Sadd. Call me directly on 5590 1020 or WhatsApp, no agents.", ar: "شقة غرفتين مفروشة رخيصة جداً في السد. اتصل مباشرة على 5590 1020 أو واتساب، بدون وسطاء." } },
  { id: "MP-10254", adv: "adv-gulfkey", purpose: "rent", type: "villa", zone: "alwaab", beds: 5, baths: 6, area: 450, price: 21500, furnishing: "unfurnished", title: { en: "Compound villa 5BR with shared pool, Al Waab", ar: "فيلا 5 غرف في كمباوند مع مسبح مشترك، الوعب" }, amenities: ["pool", "gym", "security", "kids"], status: "pending", daysAgo: 0 },
  { id: "MP-10255", adv: "adv-gulfkey", purpose: "sale", type: "apartment", zone: "pearl", beds: 2, baths: 3, area: 150, price: 2350000, furnishing: "semi", title: { en: "2BR in Abraj Quartier with marina view", ar: "شقة غرفتين في أبراج كوارتييه بإطلالة على المارينا" }, amenities: ["pool", "gym", "beach", "security"], status: "pending", daysAgo: 1, permit: null, jitter: [0.005, -0.004] },
];

const NOW = new Date("2026-10-24T09:00:00+03:00").getTime();
const DAY = 86400000;

function build(o: Seed, n: number): Listing {
  const z = zoneById(o.zone);
  const [jl, jg] = o.jitter ?? [((n * 37) % 11) / 1000 - 0.005, ((n * 53) % 13) / 1000 - 0.006];
  const created = NOW - o.daysAgo * DAY;
  const adv = advertiserById(o.adv);
  return {
    id: o.id,
    orgId: adv.orgId,
    advertiserId: o.adv,
    purpose: o.purpose,
    type: o.type,
    status: o.status ?? "live",
    title: o.title,
    description: o.descOverride ?? describe(o),
    price: o.price,
    negotiable: n % 3 === 0,
    cheques: o.purpose === "rent" ? (o.cheques ?? (n % 2 ? 12 : 6)) : undefined,
    deposit: o.purpose === "rent" ? o.price : undefined,
    commission: o.purpose === "rent" ? (adv.kind === "individual" && !adv.licence ? undefined : "50%") : "2%",
    utilitiesIncluded: !!o.utilities,
    beds: o.beds,
    baths: o.baths,
    area: o.area,
    floor: o.floor,
    furnishing: o.furnishing,
    parking: o.type === "villa" ? 3 : o.type === "studio" ? 1 : o.beds >= 3 ? 2 : 1,
    view: o.view,
    maidRoom: !!o.maid,
    balcony: o.type === "apartment" || o.type === "penthouse",
    pets: !!o.pets,
    suitability: o.suitability ?? "any",
    zoneId: o.zone,
    building: o.building,
    lat: z.lat + jl,
    lng: z.lng + jg,
    amenities: o.amenities,
    media: gallery(n, o.type, o.beds),
    video: n % 4 === 0 ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : undefined,
    tour360: n % 5 === 0 ? "https://my.matterport.com/show/?m=demo" : undefined,
    permitNo: o.permit === null ? undefined : `QA-RE-${2026}${String(40000 + n * 137).slice(0, 5)}`,
    promotion: o.promotion ?? "none",
    createdAt: new Date(created).toISOString(),
    expiresAt: new Date(created + 60 * DAY).toISOString(),
    source: o.source ?? (n % 6 === 0 ? "bulk" : "manual"),
    stats: o.status === "pending" ? { views: 0, saves: 0, enquiries: 0, waClicks: 0 } : stats(n),
  };
}

export const seedListings: Listing[] = seeds.map(build);

export const DEMO_NOW = NOW;
