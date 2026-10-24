"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_ADVERTISER_ID, DEMO_NOW, seedListings, type Listing, type ListingStatus } from "./data";
import type { Bi } from "./i18n";

// ---------- Types ----------

export type Channel = "whatsapp" | "web" | "ai" | "meta";

export interface Lead {
  id: string;
  listingId?: string;
  advertiserId: string;
  name: string;
  phone?: string;
  channel: Channel;
  message: string;
  createdAt: string;
  status: "new" | "contacted" | "viewing" | "closed";
  score?: number; // AI lead-quality score 0-100 (WP-SUP-05)
  source?: string; // e.g. "Click-to-WhatsApp ad: Pearl Q4", "Organic search"
}

export interface ChatMsg {
  id: string;
  from: "user" | "bot" | "agent" | "system" | "note";
  text: string;
  at: string;
  listingIds?: string[];
  buttons?: string[];
  media?: { src: string; caption: string }[];
  status?: "sent" | "delivered" | "read";
}

export interface Conversation {
  id: string;
  channel: Channel;
  customer: { name: string; phone?: string; lang: "en" | "ar" };
  listingId?: string;
  assignee?: string;
  status: "bot" | "open" | "pending" | "closed";
  tags: string[];
  messages: ChatMsg[];
  slaDueAt?: string;
  createdAt: string;
  updatedAt: string;
  handoverReason?: string;
  source?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: "admin" | "moderator" | "agent" | "ai" | "system" | "advertiser";
  action: string;
  target?: string;
  detail?: string;
}

export interface Invoice {
  id: string;
  at: string;
  description: Bi;
  amount: number;
  status: "paid" | "pending";
  method: "card" | "bank" | "debit";
  lines: { label: Bi; amount: number }[];
}

export interface Subscription {
  planId: string;
  cycle: "monthly" | "annual";
  status: "active" | "trial" | "grace" | "past_due";
  startedAt: string;
  renewsAt: string;
  autoRenew: boolean;
  featuredUsed: number;
  bumpsUsed: number;
}

export interface Campaign {
  id: string;
  listingId: string;
  status: "draft" | "pending_approval" | "active" | "blocked" | "completed";
  objective: "leads" | "messages" | "traffic";
  audience: { locations: string[]; ageMin: number; ageMax: number; interests: string[] };
  dailyBudget: number;
  days: number;
  serviceFee: number;
  copy: { en: string; ar: string };
  createdAt: string;
  approvedAt?: string;
  metrics?: { spend: number; reach: number; clicks: number; leads: number };
}

export interface NotificationLog {
  id: string;
  at: string;
  channel: "email" | "whatsapp" | "sms" | "inapp";
  to: string;
  template: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
}

export interface Consent {
  id: string;
  subject: string;
  channel: "whatsapp" | "marketing_email";
  optedIn: boolean;
  at: string;
  via: string;
}

export interface DemoState {
  v: number;
  listings: Listing[];
  favourites: string[];
  compare: string[];
  leads: Lead[];
  conversations: Conversation[];
  audit: AuditEntry[];
  subscription: Subscription;
  invoices: Invoice[];
  campaigns: Campaign[];
  notifications: NotificationLog[];
  consents: Consent[];
}

// ---------- Seed ----------

const iso = (minsAgo: number) => new Date(DEMO_NOW - minsAgo * 60000).toISOString();
let counter = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}${(counter++).toString(36)}`;

function seedState(): DemoState {
  return {
    v: VERSION,
    listings: seedListings,
    favourites: [],
    compare: [],
    leads: [
      { id: "L-901", listingId: "MP-10231", advertiserId: DEMO_ADVERTISER_ID, name: "James Carter", phone: "+974 3344 1122", channel: "whatsapp", message: "Requested property pack; asked about parking.", createdAt: iso(35), status: "new", score: 82, source: "Click-to-WhatsApp ad: Pearl sea-view" },
      { id: "L-902", listingId: "MP-10244", advertiserId: DEMO_ADVERTISER_ID, name: "Noura Al-Mannai", phone: "+974 5501 7788", channel: "ai", message: "AI assistant shortlist: penthouse, budget up to 40k, family of 5.", createdAt: iso(120), status: "new", score: 91, source: "AI assistant (web)" },
      { id: "L-903", listingId: "MP-10241", advertiserId: DEMO_ADVERTISER_ID, name: "Daniel Rossi", phone: "+974 6677 2211", channel: "web", message: "Is the townhouse available from 1 December?", createdAt: iso(300), status: "contacted", score: 64, source: "Organic search" },
      { id: "L-904", listingId: "MP-10233", advertiserId: DEMO_ADVERTISER_ID, name: "Hassan Ibrahim", phone: "+974 5000 4433", channel: "meta", message: "Lead form: buying in 3 months, mortgage pre-approved.", createdAt: iso(900), status: "viewing", score: 88, source: "Meta Lead Ad: Viva Bahriya" },
      { id: "L-905", listingId: "MP-10251", advertiserId: DEMO_ADVERTISER_ID, name: "Anna Kowalski", channel: "web", message: "Are pets allowed?", createdAt: iso(1500), status: "closed", score: 40, source: "Organic search" },
    ],
    conversations: [
      {
        id: "C-501",
        channel: "whatsapp",
        customer: { name: "فاطمة آل ثاني", phone: "+974 5550 2211", lang: "ar" },
        listingId: "MP-10234",
        status: "open",
        tags: ["viewing", "family"],
        createdAt: iso(26),
        updatedAt: iso(4),
        slaDueAt: new Date(DEMO_NOW + 11 * 60000).toISOString(),
        handoverReason: "Customer asked to negotiate rent and book a viewing (outside AI scope).",
        source: "Organic: Chat on WhatsApp button",
        messages: [
          { id: "m1", from: "user", text: "السلام عليكم، أبحث عن فيلا 5 غرف في الوعب للإيجار", at: iso(26) },
          { id: "m2", from: "bot", text: "وعليكم السلام! وجدت 2 فلل مناسبة في الوعب. الأفضل: MP-10234 فيلا 5 غرف في كمباوند مع مسبح مشترك، 22,000 ر.ق شهرياً.", at: iso(25), listingIds: ["MP-10234"], buttons: ["ملف العقار", "عقارات مشابهة", "تحدث مع موظف"] },
          { id: "m3", from: "user", text: "ملف العقار", at: iso(22) },
          { id: "m4", from: "bot", text: "📄 فيلا 5 غرف في كمباوند مع مسبح مشترك، الوعب\n💰 22,000 ر.ق / شهرياً\n📐 450 م² · 5 غرف · 6 حمامات\n📍 الوعب", at: iso(22), media: [{ src: "/img/ext-6.jpg", caption: "الواجهة" }, { src: "/img/liv-4.jpg", caption: "غرفة المعيشة" }, { src: "/img/bed-4.jpg", caption: "غرفة النوم" }], status: "read" },
          { id: "m5", from: "user", text: "هل يمكن تخفيض السعر إلى 20 ألف؟ وأريد موعد معاينة يوم السبت", at: iso(6) },
          { id: "m6", from: "system", text: "AI handed over to a human agent: price negotiation and viewing request.", at: iso(5) },
          { id: "m7", from: "note", text: "Checked with Doha Prime: owner may accept 21k on 12 cheques. — Layla", at: iso(4) },
        ],
      },
      {
        id: "C-502",
        channel: "whatsapp",
        customer: { name: "James Carter", phone: "+974 3344 1122", lang: "en" },
        listingId: "MP-10231",
        status: "bot",
        tags: ["ctwa"],
        createdAt: iso(40),
        updatedAt: iso(33),
        source: "Click-to-WhatsApp ad: Pearl sea-view",
        messages: [
          { id: "m1", from: "user", text: "Hi, I saw your ad for the sea-view apartment at The Pearl", at: iso(40) },
          { id: "m2", from: "bot", text: "Hello James! That's MP-10231, a furnished 2BR in Porto Arabia at QAR 12,500/month with full sea view. Would you like the full property pack?", at: iso(39), listingIds: ["MP-10231"], buttons: ["Property pack", "Book a viewing", "Talk to agent"] },
          { id: "m3", from: "user", text: "Property pack", at: iso(36) },
          { id: "m4", from: "bot", text: "Here's the pack for MP-10231 — 8 photos by room plus the floor plan.", at: iso(35), media: [{ src: "/img/hero-tower.jpg", caption: "Exterior" }, { src: "/img/liv-1.jpg", caption: "Living room" }, { src: "/img/kit-1.jpg", caption: "Kitchen" }], status: "read" },
          { id: "m5", from: "user", text: "Is there covered parking?", at: iso(34) },
          { id: "m6", from: "bot", text: "Yes — 1 covered parking space is included (per listing MP-10231).", at: iso(33) },
        ],
      },
      {
        id: "C-503",
        channel: "web",
        customer: { name: "Priya Nair", phone: "+974 7788 9900", lang: "en" },
        listingId: "MP-10235",
        status: "open",
        tags: [],
        createdAt: iso(55),
        updatedAt: iso(55),
        slaDueAt: new Date(DEMO_NOW - 5 * 60000).toISOString(),
        source: "Enquiry form",
        messages: [{ id: "m1", from: "user", text: "Is the parking covered? Could I view on Saturday morning?", at: iso(55) }],
      },
      {
        id: "C-504",
        channel: "meta",
        customer: { name: "Mohammed Saleh", phone: "+974 5512 9988", lang: "ar" },
        listingId: "MP-10237",
        status: "open",
        tags: ["buyer", "hot"],
        createdAt: iso(180),
        updatedAt: iso(180),
        slaDueAt: new Date(DEMO_NOW + 40 * 60000).toISOString(),
        source: "Meta Lead Ad: Lusail villas Q4",
        messages: [{ id: "m1", from: "user", text: "Lead form — Budget: 7–8M QAR · Timeline: within 3 months · Financing: cash · Preferred contact: WhatsApp", at: iso(180) }],
      },
      {
        id: "C-505",
        channel: "ai",
        customer: { name: "Visitor #4821", lang: "en" },
        status: "closed",
        tags: ["resolved-by-ai"],
        createdAt: iso(400),
        updatedAt: iso(390),
        source: "AI assistant (web)",
        messages: [
          { id: "m1", from: "user", text: "How much does it cost to list as an agency?", at: iso(400) },
          { id: "m2", from: "bot", text: "The Agency plan is QAR 1,999/month: 150 listings, 10 team seats, bulk upload and a branded page. Source: Advertiser plans and prices.", at: iso(399) },
        ],
      },
    ],
    audit: [
      { id: "A-1", at: iso(15), actor: "Layla (Support)", role: "agent", action: "conversation.assigned", target: "C-501" },
      { id: "A-2", at: iso(5), actor: "AI Support Agent", role: "ai", action: "conversation.handover", target: "C-501", detail: "reason=negotiation" },
      { id: "A-3", at: iso(60), actor: "Khalid (Moderator)", role: "moderator", action: "listing.approved", target: "MP-10235" },
      { id: "A-4", at: iso(240), actor: "AI Marketing Agent", role: "ai", action: "tool.meta.draft_campaign", target: "MP-10233", detail: "read-only; awaiting approval" },
      { id: "A-5", at: iso(600), actor: "Admin", role: "admin", action: "plan.updated", target: "professional", detail: "featuredCredits 3 → 5" },
    ],
    subscription: {
      planId: "agency",
      cycle: "monthly",
      status: "active",
      startedAt: "2025-03-01T00:00:00+03:00",
      renewsAt: "2026-11-01T00:00:00+03:00",
      autoRenew: true,
      featuredUsed: 12,
      bumpsUsed: 41,
    },
    invoices: [
      { id: "INV-2026-000412", at: "2026-10-01T09:00:00+03:00", description: { en: "Agency plan — October 2026", ar: "باقة الوكالة — أكتوبر 2026" }, amount: 1999, status: "paid", method: "card", lines: [{ label: { en: "Agency plan (monthly)", ar: "باقة الوكالة (شهري)" }, amount: 1999 }] },
      { id: "INV-2026-000377", at: "2026-09-14T12:30:00+03:00", description: { en: "Add-on: 5 featured slots", ar: "إضافة: 5 خانات مميزة" }, amount: 750, status: "paid", method: "debit", lines: [{ label: { en: "Featured slot × 5", ar: "خانة مميزة × 5" }, amount: 750 }] },
      { id: "INV-2026-000351", at: "2026-09-01T09:00:00+03:00", description: { en: "Agency plan — September 2026", ar: "باقة الوكالة — سبتمبر 2026" }, amount: 1999, status: "paid", method: "card", lines: [{ label: { en: "Agency plan (monthly)", ar: "باقة الوكالة (شهري)" }, amount: 1999 }] },
    ],
    campaigns: [
      {
        id: "CMP-77",
        listingId: "MP-10233",
        status: "active",
        objective: "messages",
        audience: { locations: ["Doha", "Lusail", "Al Rayyan"], ageMin: 28, ageMax: 60, interests: ["Real estate investing", "Luxury goods"] },
        dailyBudget: 150,
        days: 14,
        serviceFee: 300,
        copy: { en: "Own a beachfront 3BR at The Pearl. Freehold, ready to move in.", ar: "تملّك شقة 3 غرف على الشاطئ في اللؤلؤة. تملك حر وجاهزة للسكن." },
        createdAt: iso(60 * 24 * 6),
        approvedAt: iso(60 * 24 * 6 - 30),
        metrics: { spend: 1240, reach: 48200, clicks: 1310, leads: 37 },
      },
    ],
    notifications: [
      { id: "N-1", at: iso(35), channel: "whatsapp", to: "+974 3344 1122", template: "property_pack_v2", status: "read" },
      { id: "N-2", at: iso(300), channel: "email", to: "daniel.r@example.com", template: "enquiry_received", status: "delivered" },
      { id: "N-3", at: iso(60 * 24), channel: "sms", to: "+974 5590 1020", template: "otp_login", status: "delivered" },
      { id: "N-4", at: iso(60 * 30), channel: "whatsapp", to: "+974 5512 3456", template: "listing_expiry_reminder", status: "delivered" },
    ],
    consents: [
      { id: "CS-1", subject: "+974 3344 1122", channel: "whatsapp", optedIn: true, at: iso(40), via: "Click-to-WhatsApp first message" },
      { id: "CS-2", subject: "+974 5550 2211", channel: "whatsapp", optedIn: true, at: iso(26), via: "Chat on WhatsApp button" },
    ],
  };
}

/**
 * Seed timestamps are authored relative to DEMO_NOW. On a fresh client load, shift every ISO
 * timestamp so the demo always looks "live" (SLA timers, "5 minutes ago", expiry dates).
 */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
function shiftDates<T>(v: T, delta: number): T {
  if (typeof v === "string") return (ISO_RE.test(v) ? new Date(new Date(v).getTime() + delta).toISOString() : v) as T;
  if (Array.isArray(v)) return v.map((x) => shiftDates(x, delta)) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shiftDates(x, delta)])) as T;
  }
  return v;
}
const freshSeed = () => shiftDates(seedState(), Date.now() - DEMO_NOW);

// ---------- Store ----------

const VERSION = 3;
const KEY = "maxpro-demo";

interface Ctx {
  state: DemoState;
  ready: boolean;
  update: (fn: (s: DemoState) => DemoState) => void;
  audit: (e: Omit<AuditEntry, "id" | "at">) => void;
  setListingStatus: (id: string, status: ListingStatus, actor: string, role: AuditEntry["role"], detail?: string) => void;
  toggleFavourite: (id: string) => void;
  toggleCompare: (id: string) => void;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(seedState);
  const [ready, setReady] = useState(false);
  const skipWrite = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState;
        // Restoring persisted demo state after mount keeps SSR and first client render identical.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed.v === VERSION) setState(parsed);
        else setState(freshSeed());
      } else {
        setState(freshSeed());
      }
    } catch {}
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        skipWrite.current = true;
        setState(JSON.parse(e.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded (large uploaded photos): keep working in memory for this session.
      window.dispatchEvent(new CustomEvent("maxpro:toast", { detail: "Demo storage full — changes kept for this session only" }));
    }
  }, [state, ready]);

  const update = useCallback((fn: (s: DemoState) => DemoState) => setState((s) => fn(s)), []);

  const audit = useCallback(
    (e: Omit<AuditEntry, "id" | "at">) =>
      setState((s) => ({ ...s, audit: [{ ...e, id: uid("A"), at: new Date().toISOString() }, ...s.audit] })),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      update,
      audit,
      setListingStatus: (id, status, actor, role, detail) =>
        setState((s) => ({
          ...s,
          listings: s.listings.map((l) => (l.id === id ? { ...l, status } : l)),
          audit: [{ id: uid("A"), at: new Date().toISOString(), actor, role, action: `listing.${status}`, target: id, detail }, ...s.audit],
        })),
      toggleFavourite: (id) =>
        setState((s) => ({
          ...s,
          favourites: s.favourites.includes(id) ? s.favourites.filter((x) => x !== id) : [...s.favourites, id],
        })),
      toggleCompare: (id) =>
        setState((s) => ({
          ...s,
          compare: s.compare.includes(id)
            ? s.compare.filter((x) => x !== id)
            : s.compare.length >= 4
              ? s.compare
              : [...s.compare, id],
        })),
      reset: () => {
        localStorage.removeItem(KEY);
        skipWrite.current = true;
        setState(freshSeed());
      },
    }),
    [state, ready, update, audit],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

export function useListing(id: string) {
  const { state } = useStore();
  return state.listings.find((l) => l.id === id);
}
