import { advertiserById, furnishingName, seedListings, typeName, zoneById, zones, type Listing } from "../data";
import { compactQar, priceLabel } from "../format";
import type { Locale } from "../i18n";
import { kbSearch } from "../kb";
import { searchListings, similarListings, type SearchQuery } from "../search";
import type { LeadStub, ToolCallLog } from "./types";

/**
 * Controlled, least-privilege tools for the AI agents (WP-SUP-03, brief §10.1).
 * Read-only access to LIVE listings and the knowledge base; leads and handovers
 * are returned as stubs and persisted by the application, never by the model.
 */

export const liveListings = () => seedListings.filter((l) => l.status === "live");
export const isLiveId = (id: string) => liveListings().some((l) => l.id === id);

export interface SearchCriteria {
  purpose?: "rent" | "sale";
  type?: Listing["type"];
  zone?: string;
  max_price?: number;
  min_price?: number;
  min_beds?: number;
  furnishing?: Listing["furnishing"];
  amenities?: string[];
  keyword?: string;
  family?: boolean;
}

export interface SearchHit {
  id: string;
  title: string;
  price: string;
  beds: number;
  baths: number;
  area_sqm: number;
  zone: string;
  type: string;
  furnishing: string;
  verified_advertiser: boolean;
  reason: string;
  score: number;
}

function reasonFor(l: Listing, c: SearchCriteria, lang: Locale): { text: string; score: number } {
  const ar = lang === "ar";
  const parts: string[] = [];
  let score = 0;
  if (c.zone && l.zoneId === c.zone) {
    parts.push(ar ? `في ${zoneById(l.zoneId).name.ar}` : `in ${zoneById(l.zoneId).name.en}`);
    score += 3;
  }
  if (c.min_beds !== undefined && l.beds >= c.min_beds) {
    parts.push(ar ? (l.beds === 0 ? "استوديو" : `${l.beds} غرف نوم`) : l.beds === 0 ? "studio" : `${l.beds} bedrooms`);
    score += l.beds === c.min_beds ? 3 : 1;
  }
  if (c.max_price && l.price <= c.max_price) {
    parts.push(ar ? `ضمن ميزانيتك ${compactQar(c.max_price, "ar")}` : `within your ${compactQar(c.max_price, "en")} budget`);
    score += 2 + (l.price / c.max_price > 0.75 ? 1 : 0);
  }
  if (c.furnishing && l.furnishing === c.furnishing) {
    parts.push(furnishingName[l.furnishing][lang]);
    score += 1;
  }
  for (const a of c.amenities ?? []) {
    if (l.amenities.includes(a)) {
      parts.push(ar ? `يتوفر ${a === "pool" ? "مسبح" : a === "gym" ? "نادي رياضي" : a === "beach" ? "وصول للشاطئ" : a}` : `has ${a === "beach" ? "beach access" : a}`);
      score += 1;
    }
  }
  if (c.family && l.suitability === "family") {
    parts.push(ar ? "مناسب للعائلات" : "family-friendly");
    score += 1;
  }
  if (advertiserById(l.advertiserId).verified) score += 0.5;
  if (l.promotion !== "none") score += 0.25;
  if (!parts.length) parts.push(ar ? `${typeName(l.type).ar} في ${zoneById(l.zoneId).name.ar}` : `${typeName(l.type).en} in ${zoneById(l.zoneId).name.en}`);
  return { text: parts.join(ar ? "، " : ", "), score };
}

export function searchTool(c: SearchCriteria, lang: Locale, limit = 3): { total: number; results: SearchHit[] } {
  const q: SearchQuery = {
    purpose: c.purpose,
    type: c.type,
    zone: c.zone,
    maxPrice: c.max_price,
    minPrice: c.min_price,
    beds: c.min_beds,
    furnishing: c.furnishing,
    amenities: c.amenities?.length ? c.amenities : undefined,
    q: c.keyword || undefined,
  };
  const found = searchListings(liveListings(), q);
  const ranked = found
    .map((l) => ({ l, r: reasonFor(l, c, lang) }))
    .sort((a, b) => b.r.score - a.r.score)
    .slice(0, limit);
  return {
    total: found.length,
    results: ranked.map(({ l, r }) => ({
      id: l.id,
      title: l.title[lang],
      price: priceLabel(l.price, l.purpose, lang),
      beds: l.beds,
      baths: l.baths,
      area_sqm: l.area,
      zone: zoneById(l.zoneId).name[lang],
      type: typeName(l.type)[lang],
      furnishing: furnishingName[l.furnishing][lang],
      verified_advertiser: advertiserById(l.advertiserId).verified,
      reason: r.text,
      score: r.score,
    })),
  };
}

export function getListingTool(id: string, lang: Locale) {
  const l = liveListings().find((x) => x.id === id.toUpperCase());
  if (!l) return { error: `Listing ${id} is not live or does not exist.` };
  const adv = advertiserById(l.advertiserId);
  return {
    id: l.id,
    title: l.title[lang],
    description: l.description[lang],
    purpose: l.purpose,
    type: typeName(l.type)[lang],
    price: priceLabel(l.price, l.purpose, lang),
    cheques: l.cheques,
    beds: l.beds,
    baths: l.baths,
    area_sqm: l.area,
    furnishing: furnishingName[l.furnishing][lang],
    parking_spaces: l.parking,
    maid_room: l.maidRoom,
    pets_allowed: l.pets,
    utilities_included: l.utilitiesIncluded,
    zone: zoneById(l.zoneId).name[lang],
    building: l.building?.[lang],
    amenities: l.amenities,
    advertiser: { name: adv.name[lang], verified: adv.verified },
    permit_no: l.permitNo,
    url: `/${lang}/listing/${l.id}`,
  };
}

export function similarTool(id: string, lang: Locale) {
  const l = liveListings().find((x) => x.id === id);
  if (!l) return [];
  return similarListings(liveListings(), l, 3).map((x) => ({
    id: x.id,
    title: x.title[lang],
    price: priceLabel(x.price, x.purpose, lang),
    zone: zoneById(x.zoneId).name[lang],
  }));
}

export function platformInfoTool(question: string, lang: Locale) {
  const hits = kbSearch(question).slice(0, 2);
  return hits.map((a) => ({ title: a.title[lang], answer: a.body[lang], source_url: `/${lang}${a.url}` }));
}

export function createLeadTool(input: LeadStub) {
  const valid = input.listingIds.filter(isLiveId);
  if (!input.consent) return { ok: false, error: "Consent is required before creating a lead." };
  if (!valid.length) return { ok: false, error: "No live listing referenced." };
  return { ok: true, lead: { ...input, listingIds: valid } };
}

// ---------- Tool definitions for the LLM path (strict schemas) ----------

const zoneEnum = zones.map((z) => z.id);

export const toolDefs = [
  {
    name: "search_listings",
    description:
      "Search LIVE MaxPro property listings in Qatar. Returns up to 3 ranked matches, each with a listing id and a reason. Use for any property recommendation. Zones are ids such as 'pearl', 'lusail', 'westbay'. Prices are QAR (monthly for rent).",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      required: [],
      properties: {
        purpose: { type: "string", enum: ["rent", "sale"] },
        type: { type: "string", enum: ["apartment", "villa", "townhouse", "penthouse", "studio", "office"] },
        zone: { type: "string", enum: zoneEnum },
        max_price: { type: "number" },
        min_price: { type: "number" },
        min_beds: { type: "integer" },
        furnishing: { type: "string", enum: ["furnished", "semi", "unfurnished"] },
        amenities: { type: "array", items: { type: "string", enum: ["pool", "gym", "security", "elevator", "central_ac", "beach", "kids", "concierge", "garden", "sauna", "metro", "covered_parking"] } },
        keyword: { type: "string" },
        family: { type: "boolean" },
      },
    },
  },
  {
    name: "get_listing",
    description: "Get full facts for one LIVE listing by id (e.g. MP-10231). Use before answering detailed questions about a property.",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "similar_listings",
    description: "Find up to 3 live listings similar to a given listing id.",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      required: ["id"],
      properties: { id: { type: "string" } },
    },
  },
  {
    name: "platform_info",
    description: "Answer questions about MaxPro itself (plans, prices, how to list, verification, WhatsApp opt-out, promoting listings) from the managed knowledge base. Always cite the returned source_url.",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      required: ["question"],
      properties: { question: { type: "string" } },
    },
  },
  {
    name: "create_lead",
    description: "Register the user's interest so the advertiser contacts them. Only call after the user has given their name, phone and explicit consent to be contacted.",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      required: ["listing_ids", "name", "phone", "consent"],
      properties: {
        listing_ids: { type: "array", items: { type: "string" } },
        name: { type: "string" },
        phone: { type: "string" },
        consent: { type: "boolean" },
      },
    },
  },
  {
    name: "handover_to_human",
    description: "Hand the conversation to a human MaxPro support agent. Use when the user asks for a person, when you are not confident, for negotiation or viewing bookings, or for legal, financial, visa or other sensitive topics.",
    strict: true,
    input_schema: {
      type: "object" as const,
      additionalProperties: false,
      required: ["reason"],
      properties: { reason: { type: "string" } },
    },
  },
];

export interface ToolContext {
  lang: Locale;
  log: ToolCallLog[];
  handover?: { reason: string };
  lead?: LeadStub;
  kb: { title: string; url: string }[];
}

/** Executes a tool by name with timing + logging (every tool call is logged, WP-MKT-07 / §10.1). */
export function runTool(name: string, rawInput: object, ctx: ToolContext): unknown {
  const input = rawInput as Record<string, unknown>;
  const t0 = performance.now();
  let out: unknown;
  switch (name) {
    case "search_listings":
      out = searchTool(input as SearchCriteria, ctx.lang);
      break;
    case "get_listing":
      out = getListingTool(String(input.id ?? ""), ctx.lang);
      break;
    case "similar_listings":
      out = similarTool(String(input.id ?? "").toUpperCase(), ctx.lang);
      break;
    case "platform_info": {
      const hits = platformInfoTool(String(input.question ?? ""), ctx.lang);
      for (const h of hits) if (!ctx.kb.some((k) => k.url === h.source_url)) ctx.kb.push({ title: h.title, url: h.source_url });
      out = hits.length ? hits : { error: "No knowledge-base article found. Offer a human agent." };
      break;
    }
    case "create_lead": {
      const res = createLeadTool({
        listingIds: (input.listing_ids as string[]) ?? [],
        name: String(input.name ?? ""),
        phone: String(input.phone ?? ""),
        consent: Boolean(input.consent),
      });
      if (res.ok && res.lead) ctx.lead = res.lead;
      out = res;
      break;
    }
    case "handover_to_human":
      ctx.handover = { reason: String(input.reason ?? "User requested a person") };
      out = { ok: true, message: "A human agent has been notified and will join shortly." };
      break;
    default:
      out = { error: `Unknown tool ${name}` };
  }
  ctx.log.push({ name, input, ms: Math.round((performance.now() - t0) * 10) / 10 });
  return out;
}

/**
 * Grounding validation layer (WP-SUP-03): any listing id in the reply that is
 * not a LIVE listing is stripped before the reply reaches the user.
 */
export function validateReply(reply: string): { reply: string; listings: string[]; removed: string[] } {
  const ids = [...new Set(reply.match(/MP-\d{5}/g) ?? [])];
  const removed = ids.filter((id) => !isLiveId(id));
  let clean = reply;
  for (const id of removed) clean = clean.replaceAll(id, "[unverified listing removed]");
  return { reply: clean, listings: ids.filter(isLiveId), removed };
}
