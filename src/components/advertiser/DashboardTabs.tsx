"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpCircle,
  BadgeCheck,
  Bot,
  CalendarClock,
  Copy,
  Eye,
  FileText,
  Globe,
  Heart,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge, btn, Card, cn, input, ReqTag, Stat } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { Modal } from "./Modal";
import { InvoiceView } from "./InvoiceView";
import { advertiserById, DEMO_ADVERTISER_ID, DEMO_NOW, planById, type Listing, type ListingStatus } from "@/lib/data";
import { gregorian, num, qar, timeAgo } from "@/lib/format";
import { uid, useStore, type Channel, type Invoice, type Lead } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import type { Bi } from "@/lib/i18n";

const DAY = 86400000;

export const statusMeta: Record<ListingStatus, { label: Bi; tone: "green" | "amber" | "stone" | "red" | "blue" | "violet" }> = {
  draft: { label: { en: "Draft", ar: "مسودة" }, tone: "stone" },
  pending: { label: { en: "Pending review", ar: "قيد المراجعة" }, tone: "amber" },
  live: { label: { en: "Live", ar: "منشور" }, tone: "green" },
  paused: { label: { en: "Paused", ar: "متوقف" }, tone: "stone" },
  rejected: { label: { en: "Rejected", ar: "مرفوض" }, tone: "red" },
  expired: { label: { en: "Expired", ar: "منتهي" }, tone: "red" },
  sold: { label: { en: "Sold", ar: "مباع" }, tone: "violet" },
  rented: { label: { en: "Rented", ar: "مؤجر" }, tone: "violet" },
  archived: { label: { en: "Archived", ar: "مؤرشف" }, tone: "stone" },
};

export const channelMeta: Record<Channel, { icon: typeof Globe; label: Bi; cls: string }> = {
  whatsapp: { icon: MessageCircle, label: { en: "WhatsApp", ar: "واتساب" }, cls: "bg-wa-500/10 text-wa-700" },
  web: { icon: Globe, label: { en: "Web enquiry", ar: "نموذج الموقع" }, cls: "bg-sky-50 text-sky-700" },
  ai: { icon: Bot, label: { en: "AI assistant", ar: "المساعد الذكي" }, cls: "bg-violet-50 text-violet-700" },
  meta: { icon: Megaphone, label: { en: "Meta ads", ar: "إعلانات ميتا" }, cls: "bg-blue-50 text-blue-700" },
};

function useMine() {
  const { state } = useStore();
  return useMemo(() => state.listings.filter((l) => l.advertiserId === DEMO_ADVERTISER_ID), [state.listings]);
}

function QuotaBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-600">{label}</span>
        <span className="font-semibold text-stone-900">
          {used} / {max}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className={cn("h-full rounded-full", pct > 85 ? "bg-amber-500" : "bg-brand-600")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------- Overview ----------------

export function OverviewTab() {
  const { lang, t, p } = useLang();
  const { state } = useStore();
  const mine = useMine();
  const plan = planById(state.subscription.planId);
  const live = mine.filter((l) => l.status === "live");
  const sum = (k: keyof Listing["stats"]) => live.reduce((s, l) => s + l.stats[k], 0);
  const leads = state.leads.filter((l) => l.advertiserId === DEMO_ADVERTISER_ID);
  const views = sum("views");
  const enquiries = sum("enquiries");
  const wa = sum("waClicks");

  // 14-day series derived deterministically from totals.
  const series = Array.from({ length: 14 }, (_, i) => {
    const base = views / 30;
    const v = Math.round(base * (0.7 + 0.35 * Math.sin(i * 0.9) + (i % 7 === 4 || i % 7 === 5 ? 0.35 : 0) + i * 0.02));
    return { day: new Date(DEMO_NOW - (13 - i) * DAY), views: v, wa: Math.round(v * 0.07) };
  });
  const maxV = Math.max(...series.map((s) => s.views));

  const sources = [
    { ch: "whatsapp" as Channel, n: wa },
    { ch: "web" as Channel, n: enquiries },
    { ch: "ai" as Channel, n: Math.round(enquiries * 0.55) + leads.filter((l) => l.channel === "ai").length },
    { ch: "meta" as Channel, n: 37 + leads.filter((l) => l.channel === "meta").length },
  ];
  const srcTotal = sources.reduce((s, x) => s + x.n, 0);
  const active = mine.filter((l) => ["live", "pending", "paused"].includes(l.status)).length;
  const top = [...live].sort((a, b) => b.stats.views - a.stats.views).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("Listing views (30d)", "مشاهدات الإعلانات (30 يوم)")} value={num(views, lang)} hint={<span className="text-emerald-600">▲ 12% {t("vs last month", "عن الشهر الماضي")}</span>} icon={<Eye className="h-4 w-4" />} />
        <Stat label={t("Enquiries", "الاستفسارات")} value={num(enquiries, lang)} hint={<span className="text-emerald-600">▲ 8%</span>} icon={<FileText className="h-4 w-4" />} />
        <Stat label={t("WhatsApp clicks", "نقرات واتساب")} value={num(wa, lang)} hint={<span className="text-emerald-600">▲ 21%</span>} icon={<MessageCircle className="h-4 w-4 text-wa-600" />} />
        <Stat label={t("Leads this month", "العملاء هذا الشهر")} value={num(leads.length + 41, lang)} hint={`${leads.filter((l) => l.status === "new").length} ${t("new, awaiting reply", "جديد بانتظار الرد")}`} icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t("Views & WhatsApp clicks — last 14 days", "المشاهدات ونقرات واتساب — آخر 14 يوماً")}</h3>
            <ReqTag id="FR-LST-10" />
          </div>
          <div className="mt-4 flex h-48 items-end gap-1.5" dir="ltr">
            {series.map((s, i) => (
              <div key={i} className="group relative flex flex-1 flex-col items-center justify-end gap-0.5">
                <div className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded bg-stone-900 px-2 py-1 text-[10px] text-white group-hover:block">
                  {s.views} · WA {s.wa}
                </div>
                <div className="w-full rounded-t-md bg-wa-500" style={{ height: `${(s.wa / maxV) * 160}px` }} />
                <div className="w-full rounded-t-md bg-brand-600/80 transition group-hover:bg-brand-600" style={{ height: `${(s.views / maxV) * 160}px` }} />
                <span className="mt-1 text-[10px] text-stone-400">{s.day.getDate()}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-stone-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />{t("Views", "المشاهدات")}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-wa-500" />{t("WhatsApp clicks", "نقرات واتساب")}</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-stone-900">{t("Leads by source channel", "العملاء حسب المصدر")}</h3>
          <div className="mt-4 space-y-4">
            {sources.map((s) => {
              const m = channelMeta[s.ch];
              const pct = Math.round((s.n / srcTotal) * 100);
              return (
                <div key={s.ch}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-stone-700">
                      <span className={cn("grid h-6 w-6 place-items-center rounded-md", m.cls)}>
                        <m.icon className="h-3.5 w-3.5" />
                      </span>
                      {p(m.label)}
                    </span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-stone-800" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-stone-500">{t("Click-to-WhatsApp ads are attributed on the first message.", "تُنسب إعلانات النقر إلى واتساب من أول رسالة.")}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t("Plan usage", "استخدام الباقة")}</h3>
            <Badge tone="brand">{p(plan.name)}</Badge>
          </div>
          <div className="mt-4 space-y-4">
            <QuotaBar label={t("Active listings", "الإعلانات النشطة")} used={active} max={plan.quotas.listings} />
            <QuotaBar label={t("Featured credits", "أرصدة التمييز")} used={state.subscription.featuredUsed} max={plan.quotas.featuredCredits} />
            <QuotaBar label={t("Bumps this month", "مرات الرفع هذا الشهر")} used={state.subscription.bumpsUsed} max={plan.quotas.bumpsPerMonth} />
            <QuotaBar label={t("Team seats", "مقاعد الفريق")} used={4} max={plan.quotas.seats} />
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-stone-900">{t("Top performing listings", "الإعلانات الأفضل أداءً")}</h3>
          <div className="mt-3 divide-y divide-stone-100">
            {top.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-3">
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  <Image src={l.media[0].src} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-stone-900">{p(l.title)}</div>
                  <div className="text-xs text-stone-500">{l.id}</div>
                </div>
                <div className="hidden gap-4 text-xs text-stone-600 sm:flex">
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{num(l.stats.views, lang)}</span>
                  <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{l.stats.saves}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{l.stats.waClicks}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------- Listings ----------------

export function ListingsTab() {
  const { lang, t, p, href } = useLang();
  const { state, update, setListingStatus } = useStore();
  const mine = useMine();
  const plan = planById(state.subscription.planId);
  const [filter, setFilter] = useState<"all" | ListingStatus>("all");
  const actor = advertiserById(DEMO_ADVERTISER_ID).name.en;
  const rows = filter === "all" ? mine : mine.filter((l) => l.status === filter);

  const log = (action: string, target: string, detail?: string) => ({ id: uid("A"), at: new Date().toISOString(), actor, role: "advertiser" as const, action, target, detail });

  const renew = (l: Listing) => {
    const from = Math.max(DEMO_NOW, new Date(l.expiresAt).getTime());
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, expiresAt: new Date(from + 60 * DAY).toISOString(), status: x.status === "expired" ? "live" : x.status } : x)),
      audit: [log("listing.renewed", l.id, "+60 days"), ...s.audit],
    }));
    toast(t(`${l.id} renewed for 60 days`, `تم تجديد ${l.id} لمدة 60 يوماً`));
  };

  const bump = (l: Listing) => {
    if (state.subscription.bumpsUsed >= plan.quotas.bumpsPerMonth) return toast(t("No bumps left this month — buy add-on", "لا توجد مرات رفع متبقية — اشترِ إضافة"));
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, createdAt: new Date().toISOString() } : x)),
      subscription: { ...s.subscription, bumpsUsed: s.subscription.bumpsUsed + 1 },
      audit: [log("listing.bumped", l.id), ...s.audit],
    }));
    toast(t(`${l.id} bumped to the top`, `تم رفع ${l.id} للأعلى`));
  };

  const feature = (l: Listing) => {
    if (state.subscription.featuredUsed >= plan.quotas.featuredCredits) return toast(t("No featured credits left", "لا توجد أرصدة تمييز متبقية"));
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, promotion: "featured" } : x)),
      subscription: { ...s.subscription, featuredUsed: s.subscription.featuredUsed + 1 },
      audit: [log("listing.featured", l.id, "1 credit used"), ...s.audit],
    }));
    toast(t(`${l.id} is now Featured`, `${l.id} أصبح مميزاً`));
  };

  const duplicate = (l: Listing) => {
    const max = state.listings.reduce((m, x) => Math.max(m, Number(x.id.replace("MP-", "")) || 0), 0);
    const id = `MP-${max + 1}`;
    const now = new Date();
    const copy: Listing = {
      ...l,
      id,
      status: "draft",
      promotion: "none",
      title: { en: `${l.title.en} (copy)`, ar: `${l.title.ar} (نسخة)` },
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 60 * DAY).toISOString(),
      stats: { views: 0, saves: 0, enquiries: 0, waClicks: 0 },
    };
    update((s) => ({ ...s, listings: [copy, ...s.listings], audit: [log("listing.duplicated", id, `from ${l.id}`), ...s.audit] }));
    toast(t(`Draft ${id} created`, `تم إنشاء المسودة ${id}`));
  };

  const filters: ("all" | ListingStatus)[] = ["all", "live", "pending", "paused", "draft", "expired", "rejected"];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("rounded-full px-3 py-1 text-xs font-semibold", filter === f ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200")}
            >
              {f === "all" ? t("All", "الكل") : p(statusMeta[f].label)} ({f === "all" ? mine.length : mine.filter((l) => l.status === f).length})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          {plan.quotas.featuredCredits - state.subscription.featuredUsed} {t("featured credits", "رصيد تمييز")} ·{" "}
          {plan.quotas.bumpsPerMonth - state.subscription.bumpsUsed} {t("bumps left", "رفع متبقٍ")}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-stone-50 text-xs text-stone-500">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">{t("Listing", "الإعلان")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("Status", "الحالة")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("Performance", "الأداء")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("Expires", "ينتهي")}</th>
              <th className="px-4 py-3 text-end font-semibold">{t("Actions", "الإجراءات")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((l) => {
              const daysLeft = Math.round((new Date(l.expiresAt).getTime() - DEMO_NOW) / DAY);
              const sm = statusMeta[l.status];
              return (
                <tr key={l.id} className="align-middle hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                        {l.media[0] && <Image src={l.media[0].src} alt="" fill sizes="64px" className="object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <Link href={href(`/listing/${l.id}`)} className="line-clamp-1 font-medium text-stone-900 hover:text-brand-700">
                          {p(l.title)}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <span className="font-mono">{l.id}</span>· {l.purpose === "rent" ? `${qar(l.price, lang)}/${t("mo", "شهر")}` : qar(l.price, lang)}
                          {l.promotion !== "none" && (
                            <Badge tone="gold" className="py-0">
                              <Sparkles className="h-3 w-3" />
                              {l.promotion === "premium" ? t("Premium", "بريميوم") : t("Featured", "مميز")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={sm.tone}>{p(sm.label)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-xs text-stone-600">
                      <span className="flex items-center gap-1" title={t("Views", "مشاهدات")}><Eye className="h-3.5 w-3.5" />{num(l.stats.views, lang)}</span>
                      <span className="flex items-center gap-1" title={t("Saves", "حفظ")}><Heart className="h-3.5 w-3.5" />{l.stats.saves}</span>
                      <span className="flex items-center gap-1" title={t("Enquiries", "استفسارات")}><FileText className="h-3.5 w-3.5" />{l.stats.enquiries}</span>
                      <span className="flex items-center gap-1 text-wa-700" title="WhatsApp"><MessageCircle className="h-3.5 w-3.5" />{l.stats.waClicks}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="text-stone-700">{gregorian(l.expiresAt, lang)}</div>
                    <div className={daysLeft < 14 ? "text-amber-600" : "text-stone-400"}>
                      {daysLeft >= 0 ? `${daysLeft} ${t("days left", "يوماً متبقياً")}` : t("Expired", "منتهي")}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {l.status === "live" && (
                        <IconBtn title={t("Pause", "إيقاف")} onClick={() => { setListingStatus(l.id, "paused", actor, "advertiser"); toast(t("Listing paused", "تم إيقاف الإعلان")); }}>
                          <Pause className="h-4 w-4" />
                        </IconBtn>
                      )}
                      {l.status === "paused" && (
                        <IconBtn title={t("Resume", "استئناف")} onClick={() => { setListingStatus(l.id, "live", actor, "advertiser"); toast(t("Listing live again", "الإعلان منشور مجدداً")); }}>
                          <Play className="h-4 w-4" />
                        </IconBtn>
                      )}
                      <IconBtn title={t("Renew +60 days", "تجديد 60 يوماً")} onClick={() => renew(l)}>
                        <CalendarClock className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title={t("Bump to top", "رفع للأعلى")} onClick={() => bump(l)} disabled={l.status !== "live"}>
                        <ArrowUpCircle className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title={t("Feature (1 credit)", "تمييز (رصيد واحد)")} onClick={() => feature(l)} disabled={l.status !== "live" || l.promotion !== "none"}>
                        <Star className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title={t("Duplicate", "نسخ")} onClick={() => duplicate(l)}>
                        <Copy className="h-4 w-4" />
                      </IconBtn>
                      <Link
                        href={href(`/advertiser/promote/${l.id}`)}
                        className={cn("inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700", l.status !== "live" && "pointer-events-none opacity-40")}
                      >
                        <Megaphone className="h-3.5 w-3.5" />
                        {t("Promote on Meta", "روّج على ميتا")}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-stone-400">
                  {t("No listings in this status", "لا توجد إعلانات بهذه الحالة")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
        <RefreshCw className="h-3.5 w-3.5" />
        {t("Expiry reminders go out 7 and 1 days before expiry by email and WhatsApp; renewal is one click.", "تُرسل تذكيرات الانتهاء قبل 7 أيام ويوم واحد بالبريد وواتساب؛ التجديد بنقرة واحدة.")}
        <ReqTag id="FR-LST-06" />
      </div>
    </Card>
  );
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

// ---------------- Leads ----------------

const leadStatus: Record<Lead["status"], Bi> = {
  new: { en: "New", ar: "جديد" },
  contacted: { en: "Contacted", ar: "تم التواصل" },
  viewing: { en: "Viewing booked", ar: "معاينة محجوزة" },
  closed: { en: "Closed", ar: "مغلق" },
};

export function LeadsTab() {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const leads = state.leads.filter((l) => l.advertiserId === DEMO_ADVERTISER_ID).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const setStatus = (id: string, status: Lead["status"]) => {
    update((s) => ({
      ...s,
      leads: s.leads.map((l) => (l.id === id ? { ...l, status } : l)),
      audit: [{ id: uid("A"), at: new Date().toISOString(), actor: "Pearl Gate Realty", role: "advertiser", action: "lead.status_changed", target: id, detail: status }, ...s.audit],
    }));
    toast(t("Lead updated", "تم تحديث العميل"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <BadgeCheck className="h-4 w-4 text-brand-600" />
        {t("Routing rule (Agency plan): every lead is delivered to WhatsApp + email + this dashboard within seconds.", "قاعدة التوجيه (باقة الوكالة): يصل كل عميل إلى واتساب والبريد وهذه اللوحة خلال ثوانٍ.")}
        <ReqTag id="FR-WAP-08" />
        <ReqTag id="WP-SUP-05" />
      </div>
      <Card className="divide-y divide-stone-100">
        {leads.map((l) => {
          const m = channelMeta[l.channel];
          const listing = state.listings.find((x) => x.id === l.listingId);
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-4 p-4">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", m.cls)}>
                <m.icon className="h-5 w-5" />
              </span>
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-900">{l.name}</span>
                  {l.phone && <span className="font-mono text-xs text-stone-500" dir="ltr">{l.phone}</span>}
                  <span className="text-xs text-stone-400">· {timeAgo(l.createdAt, lang)}</span>
                </div>
                <p className="mt-0.5 text-sm text-stone-600">{l.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                  <Badge tone="stone">{p(m.label)}</Badge>
                  {l.source && <span>{t("Source", "المصدر")}: {l.source}</span>}
                  {listing && (
                    <Link href={href(`/listing/${listing.id}`)} className="font-mono text-brand-700 hover:underline">
                      {listing.id}
                    </Link>
                  )}
                </div>
              </div>
              {l.score !== undefined && (
                <div className="w-28" title={t("AI lead-quality score", "تقييم جودة العميل بالذكاء الاصطناعي")}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">{t("AI score", "تقييم")}</span>
                    <span className="font-bold">{l.score}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-stone-100">
                    <div className={cn("h-full rounded-full", l.score >= 80 ? "bg-emerald-500" : l.score >= 60 ? "bg-amber-500" : "bg-stone-400")} style={{ width: `${l.score}%` }} />
                  </div>
                </div>
              )}
              <select value={l.status} onChange={(e) => setStatus(l.id, e.target.value as Lead["status"])} className={cn(input, "w-40 py-2")}>
                {(Object.keys(leadStatus) as Lead["status"][]).map((s) => (
                  <option key={s} value={s}>
                    {p(leadStatus[s])}
                  </option>
                ))}
              </select>
              {l.phone && (
                <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className={cn(btn.wa, "px-3 py-2")}>
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          );
        })}
        {leads.length === 0 && <div className="p-10 text-center text-stone-400">{t("No leads yet", "لا يوجد عملاء بعد")}</div>}
      </Card>
    </div>
  );
}

// ---------------- Billing ----------------

export function BillingTab() {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const [view, setView] = useState<Invoice | null>(null);
  const sub = state.subscription;
  const plan = planById(sub.planId);
  const price = sub.cycle === "annual" ? plan.monthly * 10 : plan.monthly;

  const toggleRenew = () => {
    update((s) => ({
      ...s,
      subscription: { ...s.subscription, autoRenew: !s.subscription.autoRenew },
      audit: [{ id: uid("A"), at: new Date().toISOString(), actor: "Pearl Gate Realty", role: "advertiser", action: "subscription.auto_renew", detail: String(!s.subscription.autoRenew) }, ...s.audit],
    }));
    toast(sub.autoRenew ? t("Auto-renew turned off", "تم إيقاف التجديد التلقائي") : t("Auto-renew turned on", "تم تفعيل التجديد التلقائي"));
  };

  const dunning = [
    { d: t("Day 0", "اليوم 0"), text: t("Renewal charge fails → email + WhatsApp notice", "فشل التجديد ← إشعار بالبريد وواتساب") },
    { d: t("Days 1, 3, 5", "الأيام 1، 3، 5"), text: t("Automatic retries on the saved card", "إعادة محاولة تلقائية على البطاقة المحفوظة") },
    { d: t("Days 0–7", "الأيام 0–7"), text: t("Grace period — listings stay live", "فترة سماح — تبقى الإعلانات منشورة") },
    { d: t("Day 8", "اليوم 8"), text: t("Listings paused (never deleted) until payment", "إيقاف الإعلانات مؤقتاً (دون حذف) حتى الدفع") },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-1">
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t("Current plan", "الباقة الحالية")}</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xl font-bold text-stone-900">{p(plan.name)}</span>
            <Badge tone={sub.status === "active" ? "green" : "amber"}>{sub.status}</Badge>
          </div>
          <div className="mt-1 text-sm text-stone-600">
            {price > 0 ? qar(price, lang) : t("Free", "مجاناً")} / {sub.cycle === "annual" ? t("year", "سنة") : t("month", "شهر")}
          </div>
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">{t("Next renewal", "التجديد القادم")}</span>
              <span className="font-semibold">{gregorian(sub.renewsAt, lang)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-stone-500">{t("Auto-renew", "تجديد تلقائي")}</span>
              <button
                onClick={toggleRenew}
                role="switch"
                aria-checked={sub.autoRenew}
                className={cn("relative h-6 w-11 rounded-full transition", sub.autoRenew ? "bg-brand-600" : "bg-stone-300")}
              >
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", sub.autoRenew ? "start-[22px]" : "start-0.5")} />
              </button>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-stone-500">{t("Payment method", "طريقة الدفع")}</span>
              <span className="font-mono text-xs">VISA •••• 1111</span>
            </div>
          </div>
          <Link href={href("/pricing")} className={cn(btn.primary, "mt-4 w-full")}>
            {t("Change plan", "تغيير الباقة")}
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t("If a payment fails", "عند فشل الدفع")}</h3>
            <ReqTag id="FR-BIL-04" />
          </div>
          <ol className="mt-4 space-y-3 border-s-2 border-stone-200 ps-4">
            {dunning.map((d) => (
              <li key={d.d} className="relative text-sm">
                <span className="absolute -start-[23px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-600" />
                <div className="font-semibold text-stone-900">{d.d}</div>
                <div className="text-stone-600">{d.text}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <h3 className="font-semibold text-stone-900">{t("Invoices", "الفواتير")}</h3>
          <ReqTag id="FR-BIL-03" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t("Invoice", "الفاتورة")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Date", "التاريخ")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Description", "البيان")}</th>
                <th className="px-4 py-3 text-end font-semibold">{t("Amount", "المبلغ")}</th>
                <th className="px-4 py-3 text-end font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {state.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 font-mono text-xs">{inv.id}</td>
                  <td className="px-4 py-3 text-stone-600">{gregorian(inv.at, lang)}</td>
                  <td className="px-4 py-3">
                    {p(inv.description)}
                    {inv.status === "pending" && <Badge tone="amber" className="ms-2">{t("Awaiting transfer", "بانتظار التحويل")}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-end font-semibold">{qar(inv.amount, lang)}</td>
                  <td className="px-4 py-3 text-end">
                    <button onClick={() => setView(inv)} className="text-xs font-semibold text-brand-600 hover:underline">
                      {t("View / PDF", "عرض / PDF")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!view} onClose={() => setView(null)} title={view?.id} wide>
        {view && <InvoiceView inv={view} />}
      </Modal>
    </div>
  );
}

// ---------------- Team ----------------

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "agent";
  listings: number;
  twoFA: boolean;
}

const roleName: Record<Member["role"], Bi> = {
  owner: { en: "Owner", ar: "المالك" },
  manager: { en: "Manager", ar: "مدير" },
  agent: { en: "Agent", ar: "وكيل" },
};

export function TeamTab() {
  const { t, p } = useLang();
  const { state, audit } = useStore();
  const plan = planById(state.subscription.planId);
  const [members, setMembers] = useState<Member[]>([
    { id: "u1", name: "Rashid Al-Sulaiti", email: "rashid@pearlgate.qa", role: "owner", listings: 4, twoFA: true },
    { id: "u2", name: "Maria Santos", email: "maria@pearlgate.qa", role: "manager", listings: 2, twoFA: true },
    { id: "u3", name: "Yousef Darwish", email: "yousef@pearlgate.qa", role: "agent", listings: 1, twoFA: false },
    { id: "u4", name: "Emily Clarke", email: "emily@pearlgate.qa", role: "agent", listings: 0, twoFA: false },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "agent" as Member["role"] });

  const invite = () => {
    if (members.length >= plan.quotas.seats) return toast(t("Seat limit reached — upgrade plan", "تم بلوغ حد المقاعد — قم بترقية الباقة"));
    if (!form.name || !form.email) return;
    setMembers((m) => [...m, { id: uid("u"), ...form, listings: 0, twoFA: false }]);
    audit({ actor: "Rashid Al-Sulaiti", role: "advertiser", action: "team.invited", target: form.email, detail: form.role });
    toast(t(`Invitation sent to ${form.email}`, `تم إرسال الدعوة إلى ${form.email}`));
    setForm({ name: "", email: "", role: "agent" });
    setOpen(false);
  };

  const perms: [string, boolean, boolean, boolean][] = [
    [t("Create & edit listings", "إنشاء وتعديل الإعلانات"), true, true, true],
    [t("See all agency leads", "رؤية جميع عملاء الوكالة"), true, true, false],
    [t("Billing & invoices", "الفوترة والفواتير"), true, false, false],
    [t("Approve Meta campaigns", "اعتماد حملات ميتا"), true, true, false],
    [t("Manage team", "إدارة الفريق"), true, false, false],
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <div>
            <h3 className="font-semibold text-stone-900">{t("Team members", "أعضاء الفريق")}</h3>
            <p className="text-xs text-stone-500">
              {members.length} / {plan.quotas.seats} {t("seats used", "مقعد مستخدم")} · {t("shared inventory", "مخزون مشترك")}
            </p>
          </div>
          <button onClick={() => setOpen(true)} className={btn.primary}>
            <UserPlus className="h-4 w-4" />
            {t("Invite", "دعوة")}
          </button>
        </div>
        <div className="divide-y divide-stone-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-stone-200 text-xs font-bold text-stone-700">
                {m.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-stone-900">{m.name}</div>
                <div className="text-xs text-stone-500">{m.email}</div>
              </div>
              <span className="hidden text-xs text-stone-500 sm:block">
                {m.listings} {t("listings", "إعلانات")}
              </span>
              <Badge tone={m.twoFA ? "green" : "stone"}>{m.twoFA ? "2FA ✓" : t("2FA off", "التحقق الثنائي مغلق")}</Badge>
              <Badge tone={m.role === "owner" ? "brand" : "stone"}>{p(roleName[m.role])}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900">{t("Role permissions", "صلاحيات الأدوار")}</h3>
          <ReqTag id="FR-ACC-02" />
        </div>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-stone-500">
              <th className="py-2 text-start font-medium" />
              {(["owner", "manager", "agent"] as const).map((r) => (
                <th key={r} className="py-2 text-center font-medium">{p(roleName[r])}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {perms.map(([label, ...vals]) => (
              <tr key={label}>
                <td className="py-2 text-stone-700">{label}</td>
                {vals.map((v, i) => (
                  <td key={i} className="py-2 text-center">{v ? "✓" : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t("Invite a team member", "دعوة عضو للفريق")}>
        <div className="space-y-3">
          <input className={input} placeholder={t("Full name", "الاسم الكامل")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder="name@agency.qa" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Member["role"] })}>
            <option value="agent">{p(roleName.agent)}</option>
            <option value="manager">{p(roleName.manager)}</option>
          </select>
          <p className="text-xs text-stone-500">
            {plan.quotas.seats - members.length} {t("seats remaining on your plan", "مقاعد متبقية في باقتك")}
          </p>
          <button onClick={invite} className={cn(btn.primary, "w-full")}>
            {t("Send invitation", "إرسال الدعوة")}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ---------------- Verification ----------------

export function VerificationTab() {
  const { lang, t, p } = useLang();
  const adv = advertiserById(DEMO_ADVERTISER_ID);
  const docs = [
    { name: t("Commercial registration (CR)", "السجل التجاري"), ref: "CR 145872", status: "approved" },
    { name: t("Real-estate brokerage licence", "رخصة الوساطة العقارية"), ref: adv.licence ?? "", status: "approved" },
    { name: t("Authorised signatory QID", "البطاقة الشخصية للمفوض بالتوقيع"), ref: "QID •••• 4471", status: "approved" },
    { name: t("Trade licence renewal 2027", "تجديد الرخصة التجارية 2027"), ref: t("Due Feb 2027", "مستحق فبراير 2027"), status: "upcoming" },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="p-6 text-center">
        <BadgeCheck className="mx-auto h-14 w-14 text-sky-600" />
        <h3 className="mt-3 text-lg font-bold text-stone-900">{t("Verified agency", "وكالة موثقة")}</h3>
        <p className="mt-1 text-sm text-stone-500">
          {p(adv.name)} · {t("since", "منذ")} {gregorian(adv.memberSince, lang)}
        </p>
        <p className="mt-4 text-xs text-stone-500">
          {t("Verified advertisers get a badge on every listing and rank higher in search.", "يحصل المعلنون الموثقون على شارة في كل إعلان وترتيب أعلى في البحث.")}
        </p>
        <div className="mt-3 flex justify-center gap-1.5">
          <ReqTag id="FR-ACC-03" />
          <ReqTag id="NFR-LEG-01" />
        </div>
      </Card>
      <Card className="overflow-hidden lg:col-span-2">
        <div className="border-b border-stone-100 p-4">
          <h3 className="font-semibold text-stone-900">{t("Documents", "المستندات")}</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {docs.map((d) => (
            <div key={d.name} className="flex items-center gap-3 p-4">
              <FileText className="h-5 w-5 text-stone-400" />
              <div className="flex-1">
                <div className="text-sm font-medium text-stone-900">{d.name}</div>
                <div className="font-mono text-xs text-stone-500">{d.ref}</div>
              </div>
              {d.status === "approved" ? (
                <Badge tone="green">{t("Approved", "معتمد")}</Badge>
              ) : (
                <Badge tone="amber">{t("Upcoming", "قادم")}</Badge>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-stone-100 p-4 text-xs text-stone-500">
          <MousePointerClick className="h-3.5 w-3.5" />
          {t("Documents are stored encrypted and visible only to MaxPro moderators.", "تُخزن المستندات مشفرة ولا يراها إلا مشرفو ماكس برو.")}
        </div>
      </Card>
    </div>
  );
}
