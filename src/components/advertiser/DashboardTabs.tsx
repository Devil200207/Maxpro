"use client";

import { useState } from "react";
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
  TriangleAlert,
  Lock,
  Network,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Wand2,
  Wrench,
} from "lucide-react";
import { Badge, btn, Card, cn, input, ReqTag, Stat } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { Modal } from "./Modal";
import { InvoiceView } from "./InvoiceView";
import { DEMO_NOW, type Listing, type ListingStatus } from "@/lib/data";
import { portalById } from "@/lib/portals";
import { StageBadge, StageGate } from "@/lib/stage";
import { LeadManager } from "@/components/leads/LeadManager";
import { changeEntry, notification, permissionRows, permissionsFor, roleName, useAccount } from "@/components/account/useAccount";
import { gregorian, num, qar, timeAgo } from "@/lib/format";
import { uid, useStore, type Channel, type ComplianceItem, type Invoice, type ListingReport, type OrgRole } from "@/lib/store";
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
  portal: { icon: Network, label: { en: "External portal", ar: "بوابة خارجية" }, cls: "bg-amber-50 text-amber-700" },
};

function useMine() {
  return useAccount().mine;
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
  const acct = useAccount();
  const { plan, isDemoAgency } = acct;
  const mine = acct.mine;
  const live = mine.filter((l) => l.status === "live");
  const sum = (k: keyof Listing["stats"]) => live.reduce((s, l) => s + l.stats[k], 0);
  const leads = state.leads.filter((l) => l.advertiserId === acct.adv.id);
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
    { ch: "meta" as Channel, n: (isDemoAgency ? 37 : 0) + leads.filter((l) => l.channel === "meta").length },
  ];
  const srcTotal = sources.reduce((s, x) => s + x.n, 0);
  const active = acct.active;
  const top = [...live].sort((a, b) => b.stats.views - a.stats.views).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("Listing views (30d)", "مشاهدات الإعلانات (30 يوم)")} value={num(views, lang)} hint={<span className="text-emerald-600">▲ 12% {t("vs last month", "عن الشهر الماضي")}</span>} icon={<Eye className="h-4 w-4" />} />
        <Stat label={t("Enquiries", "الاستفسارات")} value={num(enquiries, lang)} hint={<span className="text-emerald-600">▲ 8%</span>} icon={<FileText className="h-4 w-4" />} />
        <Stat label={t("WhatsApp clicks", "نقرات واتساب")} value={num(wa, lang)} hint={<span className="text-emerald-600">▲ 21%</span>} icon={<MessageCircle className="h-4 w-4 text-wa-600" />} />
        <Stat label={t("Leads this month", "العملاء هذا الشهر")} value={num(leads.length + (isDemoAgency ? 41 : 0), lang)} hint={`${leads.filter((l) => l.status === "new").length} ${t("new, awaiting reply", "جديد بانتظار الرد")}`} icon={<Users className="h-4 w-4" />} />
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
            <QuotaBar label={t("Featured credits", "أرصدة التمييز")} used={isDemoAgency ? state.subscription.featuredUsed : 0} max={plan.quotas.featuredCredits} />
            <QuotaBar label={t("Bumps this month", "مرات الرفع هذا الشهر")} used={isDemoAgency ? state.subscription.bumpsUsed : 0} max={plan.quotas.bumpsPerMonth} />
            <QuotaBar label={t("Team seats", "مقاعد الفريق")} used={Math.max(1, acct.members.length)} max={plan.quotas.seats} />
            <QuotaBar label={t("AI credits this month", "أرصدة الذكاء الاصطناعي هذا الشهر")} used={acct.aiUsed} max={plan.quotas.aiCredits} />
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

const reasonDisabled = (t: (en: string, ar: string) => string, role: OrgRole) =>
  role === "readonly" ? t("Read-only users can't change listings", "مستخدم القراءة فقط لا يمكنه تعديل الإعلانات") : t("Not allowed for your role", "غير مسموح لدورك");

export function ListingsTab() {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const acct = useAccount();
  const { plan, can, role, isDemoAgency, actorName, members } = acct;
  const mine = useMine();
  const [filter, setFilter] = useState<"all" | ListingStatus>("all");
  const rows = filter === "all" ? mine : mine.filter((l) => l.status === filter);
  const featuredUsed = isDemoAgency ? state.subscription.featuredUsed : 0;
  const bumpsUsed = isDemoAgency ? state.subscription.bumpsUsed : 0;
  const deny = reasonDisabled(t, role);

  const log = (action: string, target: string, detail?: string) => ({ id: uid("A"), at: new Date().toISOString(), actor: actorName, role: "advertiser" as const, action, target, detail });

  const setStatus = (l: Listing, status: ListingStatus, msg: string) => {
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, status } : x)),
      changeLog: [changeEntry(l.id, actorName, "status", l.status, status), ...s.changeLog],
      audit: [log(`listing.${status}`, l.id), ...s.audit],
    }));
    toast(msg);
  };

  const renew = (l: Listing) => {
    const from = Math.max(DEMO_NOW, new Date(l.expiresAt).getTime());
    const to = new Date(from + 60 * DAY).toISOString();
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, expiresAt: to, status: x.status === "expired" ? "live" : x.status } : x)),
      changeLog: [changeEntry(l.id, actorName, "expiresAt", l.expiresAt.slice(0, 10), to.slice(0, 10)), ...s.changeLog],
      audit: [log("listing.renewed", l.id, "+60 days"), ...s.audit],
    }));
    toast(t(`${l.id} renewed for 60 days`, `تم تجديد ${l.id} لمدة 60 يوماً`));
  };

  const bump = (l: Listing) => {
    if (bumpsUsed >= plan.quotas.bumpsPerMonth) return toast(t("No bumps left this month — buy add-on", "لا توجد مرات رفع متبقية — اشترِ إضافة"));
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, createdAt: new Date().toISOString() } : x)),
      subscription: isDemoAgency ? { ...s.subscription, bumpsUsed: s.subscription.bumpsUsed + 1 } : s.subscription,
      audit: [log("listing.bumped", l.id), ...s.audit],
    }));
    toast(t(`${l.id} bumped to the top`, `تم رفع ${l.id} للأعلى`));
  };

  const feature = (l: Listing) => {
    if (featuredUsed >= plan.quotas.featuredCredits) return toast(t("No featured credits left on your plan", "لا توجد أرصدة تمييز متبقية في باقتك"));
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, promotion: "featured" } : x)),
      subscription: isDemoAgency ? { ...s.subscription, featuredUsed: s.subscription.featuredUsed + 1 } : s.subscription,
      changeLog: [changeEntry(l.id, actorName, "promotion", l.promotion, "featured"), ...s.changeLog],
      audit: [log("listing.featured", l.id, "1 credit used"), ...s.audit],
    }));
    toast(t(`${l.id} is now Featured`, `${l.id} أصبح مميزاً`));
  };

  const duplicate = (l: Listing) => {
    const max = state.listings.reduce((m, x) => Math.max(m, Number(x.id.replace("AQ-", "")) || 0), 0);
    const id = `AQ-${max + 1}`;
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
      priceHistory: [{ at: now.toISOString(), price: l.price }],
      assignedAgentId: role === "agent" ? acct.session.memberId : l.assignedAgentId,
    };
    update((s) => ({ ...s, listings: [copy, ...s.listings], changeLog: [changeEntry(id, actorName, "created", undefined, `duplicate of ${l.id}`), ...s.changeLog], audit: [log("listing.duplicated", id, `from ${l.id}`), ...s.audit] }));
    toast(t(`Draft ${id} created`, `تم إنشاء المسودة ${id}`));
  };

  const assign = (l: Listing, memberId: string) => {
    const from = members.find((m) => m.id === l.assignedAgentId)?.name ?? "—";
    const to = members.find((m) => m.id === memberId)?.name ?? "—";
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, assignedAgentId: memberId || undefined } : x)),
      changeLog: [changeEntry(l.id, actorName, "assignedAgent", from, to), ...s.changeLog],
      audit: [log("listing.assigned", l.id, to), ...s.audit],
    }));
    toast(t(`${l.id} assigned to ${to}`, `تم إسناد ${l.id} إلى ${to}`));
  };

  const filters: ("all" | ListingStatus)[] = ["all", "live", "pending", "paused", "draft", "expired", "rejected"];

  return (
    <div className="space-y-4">
      <ActionRequired />
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
            {!can.seeAll && <Badge tone="violet">{t("Showing listings assigned to you", "تُعرض الإعلانات المسندة إليك")}</Badge>}
            <Star className="h-3.5 w-3.5 text-amber-500" />
            {plan.quotas.featuredCredits - featuredUsed} {t("featured credits", "رصيد تمييز")} · {plan.quotas.bumpsPerMonth - bumpsUsed} {t("bumps left", "رفع متبقٍ")}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{t("Listing", "الإعلان")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Status", "الحالة")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Agent", "الوكيل")}</th>
                <th className="px-4 py-3 text-start font-semibold">
                  {t("Portals", "البوابات")} <StageBadge s="S1" className="ms-1" />
                </th>
                <th className="px-4 py-3 text-start font-semibold">{t("Performance", "الأداء")}</th>
                <th className="px-4 py-3 text-start font-semibold">{t("Expires", "ينتهي")}</th>
                <th className="px-4 py-3 text-end font-semibold">{t("Actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((l) => {
                const daysLeft = Math.round((new Date(l.expiresAt).getTime() - DEMO_NOW) / DAY);
                const sm = statusMeta[l.status];
                const pls = state.portalListings.filter((x) => x.listingId === l.id);
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
                      {can.assign && members.length > 0 ? (
                        <select value={l.assignedAgentId ?? ""} onChange={(e) => assign(l, e.target.value)} className="max-w-[140px] rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs">
                          <option value="">{t("Unassigned", "غير مسند")}</option>
                          {members
                            .filter((m) => m.role !== "readonly")
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <span className="text-xs text-stone-600">{members.find((m) => m.id === l.assignedAgentId)?.name ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {pls.length === 0 && <span className="text-xs text-stone-400">—</span>}
                        {pls.map((x) => {
                          const portal = portalById(x.portalId);
                          const ok = x.status === "published";
                          const bad = x.status === "needs_fix" || x.status === "failed" || x.status === "timeout";
                          return (
                            <span
                              key={x.id}
                              title={`${portal.name.en}: ${x.status}${x.externalId ? ` · ${x.externalId}` : ""}`}
                              className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", ok ? "bg-emerald-50 text-emerald-700" : bad ? "bg-amber-50 text-amber-800" : "bg-stone-100 text-stone-600")}
                            >
                              {portal.short} {ok ? "✓" : bad ? "!" : "…"}
                            </span>
                          );
                        })}
                      </div>
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
                      <div className="flex flex-wrap justify-end gap-1">
                        {l.status === "live" && (
                          <IconBtn title={can.edit ? t("Pause", "إيقاف") : deny} disabled={!can.edit} onClick={() => setStatus(l, "paused", t("Listing paused", "تم إيقاف الإعلان"))}>
                            <Pause className="h-4 w-4" />
                          </IconBtn>
                        )}
                        {l.status === "paused" && (
                          <IconBtn title={can.edit ? t("Resume", "استئناف") : deny} disabled={!can.edit} onClick={() => setStatus(l, "live", t("Listing live again", "الإعلان منشور مجدداً"))}>
                            <Play className="h-4 w-4" />
                          </IconBtn>
                        )}
                        <IconBtn title={can.edit ? t("Renew +60 days", "تجديد 60 يوماً") : deny} disabled={!can.edit} onClick={() => renew(l)}>
                          <CalendarClock className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title={can.edit ? t("Bump to top", "رفع للأعلى") : deny} onClick={() => bump(l)} disabled={!can.edit || l.status !== "live"}>
                          <ArrowUpCircle className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title={can.approvePublish ? t("Feature (1 credit)", "تمييز (رصيد واحد)") : deny} onClick={() => feature(l)} disabled={!can.approvePublish || l.status !== "live" || l.promotion !== "none"}>
                          <Star className="h-4 w-4" />
                        </IconBtn>
                        <IconBtn title={can.edit ? t("Duplicate", "نسخ") : deny} disabled={!can.edit} onClick={() => duplicate(l)}>
                          <Copy className="h-4 w-4" />
                        </IconBtn>
                        <Link href={href(`/advertiser/studio?listing=${l.id}`)} title={t("Open in AI Listing Studio", "فتح في استوديو الإعلانات الذكي")} className={cn("grid h-8 w-8 place-items-center rounded-lg border border-stone-200 text-violet-600 hover:bg-violet-50", !can.edit && "pointer-events-none opacity-30")}>
                          <Wand2 className="h-4 w-4" />
                        </Link>
                        <Link
                          href={href(`/hub?listing=${l.id}`)}
                          title={can.approvePublish ? t("Publish to portals", "النشر على البوابات") : t("Agents can prepare portal versions; a manager approves publishing", "يمكن للوكيل التحضير؛ يعتمد المدير النشر")}
                          className={cn("inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100", (l.status !== "live" || role === "readonly") && "pointer-events-none opacity-40")}
                        >
                          <Network className="h-3.5 w-3.5" />
                          {t("Portals", "البوابات")}
                        </Link>
                        <StageGate stage="S2" mode="hide">
                          <Link
                            href={href(`/advertiser/promote/${l.id}`)}
                            title="S2 · FR-ADV-04"
                            className={cn("inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700", (l.status !== "live" || !can.approvePublish) && "pointer-events-none opacity-40")}
                          >
                            <Megaphone className="h-3.5 w-3.5" />
                            {t("Promote on Meta", "روّج على ميتا")}
                          </Link>
                        </StageGate>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-stone-400">
                    {t("No listings in this status", "لا توجد إعلانات بهذه الحالة")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-4 py-3 text-xs text-stone-500">
          <RefreshCw className="h-3.5 w-3.5" />
          {t("Expiry reminders go out 7 and 1 days before expiry by email and WhatsApp; renewal is one click. Every change is kept in the listing's history.", "تُرسل تذكيرات الانتهاء قبل 7 أيام ويوم واحد؛ التجديد بنقرة واحدة. كل تغيير يُحفظ في سجل الإعلان.")}
          <ReqTag id="FR-LST-06" />
          <ReqTag id="FR-LST-11" />
        </div>
      </Card>
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title: string; onClick: () => void; disabled?: boolean }) {
  return (
    <span title={title} className="inline-flex">
      <button
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
        className="grid h-8 w-8 place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:pointer-events-none disabled:opacity-30"
      >
        {children}
      </button>
    </span>
  );
}

// ---------------- Action required (C6: report → fix → resubmit) ----------------

/** Listings a moderator actioned after a report; the advertiser fixes and resubmits (UAT C6). */
export function ActionRequired() {
  const { lang, t, p } = useLang();
  const { state, update } = useStore();
  const { adv, can, actorName } = useAccount();
  const [fixing, setFixing] = useState<ListingReport | null>(null);
  const items = state.reports.filter((r) => r.status === "actioned" && state.listings.find((l) => l.id === r.listingId)?.advertiserId === adv.id);
  if (!items.length) return null;

  const actionLabel = (a?: ListingReport["action"]) =>
    a === "paused" ? t("Listing paused", "الإعلان متوقف") : a === "rejected" ? t("Listing rejected", "الإعلان مرفوض") : t("Fix requested", "مطلوب تصحيح");

  return (
    <>
      {items.map((r) => {
        const l = state.listings.find((x) => x.id === r.listingId)!;
        return (
          <div key={r.id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                {t("Action required", "مطلوب إجراء")} · <span className="font-mono">{l.id}</span> · {actionLabel(r.action)}
                <ReqTag id="FR-LST-09" />
              </div>
              <div className="mt-0.5 truncate">{p(l.title)}</div>
              <div className="mt-1 text-red-800">
                {t("Reported", "بلاغ")}: <b>{p(r.reason)}</b>
                {r.moderatorNote && (
                  <>
                    {" · "}
                    {t("Moderator", "المشرف")}: “{r.moderatorNote}”
                  </>
                )}
                {" · "}
                {r.resolvedAt ? timeAgo(r.resolvedAt, lang) : timeAgo(r.at, lang)}
              </div>
            </div>
            <button onClick={() => setFixing(r)} disabled={!can.edit} title={can.edit ? undefined : t("Read-only users can't fix listings", "لا يمكن لمستخدم القراءة فقط التصحيح")} className={cn(btn.primary, "py-1.5 text-xs")}>
              <Wrench className="h-3.5 w-3.5" />
              {t("Fix & resubmit", "صحّح وأعد الإرسال")}
            </button>
          </div>
        );
      })}
      <Modal open={!!fixing} onClose={() => setFixing(null)} title={t("Fix & resubmit", "التصحيح وإعادة الإرسال")}>
        {fixing && <FixForm report={fixing} actor={actorName} onDone={() => setFixing(null)} update={update} listings={state.listings} />}
      </Modal>
    </>
  );
}

function FixForm({
  report,
  actor,
  onDone,
  update,
  listings,
}: {
  report: ListingReport;
  actor: string;
  onDone: () => void;
  update: ReturnType<typeof useStore>["update"];
  listings: Listing[];
}) {
  const { t, p } = useLang();
  const l = listings.find((x) => x.id === report.listingId)!;
  const [price, setPrice] = useState(l.price);
  const [desc, setDesc] = useState(l.description.en);
  const [mark, setMark] = useState<"keep" | "rented" | "sold">("keep");
  const [note, setNote] = useState("");

  const submit = () => {
    const now = new Date().toISOString();
    const unavailable = mark !== "keep";
    const status: ListingStatus = unavailable ? mark : "pending";
    const changes = [
      ...(price !== l.price ? [changeEntry(l.id, actor, "price", l.price, price)] : []),
      ...(desc !== l.description.en ? [changeEntry(l.id, actor, "description.en", "…", desc.slice(0, 60))] : []),
      changeEntry(l.id, actor, "status", l.status, status),
    ];
    update((s) => ({
      ...s,
      listings: s.listings.map((x) =>
        x.id === l.id
          ? {
              ...x,
              price,
              description: { ...x.description, en: desc },
              status,
              priceHistory: price !== l.price ? [...(x.priceHistory ?? [{ at: x.createdAt, price: l.price }]), { at: now, price }] : x.priceHistory,
            }
          : x,
      ),
      reports: s.reports.map((r) =>
        r.id === report.id
          ? { ...r, status: unavailable ? "actioned" : "resubmitted", moderatorNote: `${r.moderatorNote ?? ""}${note ? ` · Advertiser: ${note}` : ""}`.replace(/^ · /, ""), resolvedAt: unavailable ? now : r.resolvedAt }
          : r,
      ),
      changeLog: [...changes, ...s.changeLog],
      notifications: [notification({ channel: "inapp", to: "Moderators", template: unavailable ? "listing_marked_unavailable" : "listing_resubmitted" }), ...s.notifications],
      audit: [{ id: uid("A"), at: now, actor, role: "advertiser", action: unavailable ? `listing.${mark}` : "listing.resubmitted", target: l.id, detail: `report ${report.id}` }, ...s.audit],
    }));
    toast(unavailable ? t(`${l.id} marked ${mark}`, `تم تعليم ${l.id}`) : t(`${l.id} resubmitted for moderation`, `أُعيد إرسال ${l.id} للمراجعة`));
    onDone();
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
        <b className="font-mono">{l.id}</b> · {p(report.reason)}
        {report.moderatorNote && <> · “{report.moderatorNote}”</>}
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-stone-600">{t("Is the property still available?", "هل العقار ما زال متاحاً؟")}</span>
        <select className={input} value={mark} onChange={(e) => setMark(e.target.value as typeof mark)}>
          <option value="keep">{t("Yes — I corrected the details", "نعم — صححت التفاصيل")}</option>
          <option value="rented">{t("No — mark as rented", "لا — تعليم كمؤجر")}</option>
          <option value="sold">{t("No — mark as sold", "لا — تعليم كمباع")}</option>
        </select>
      </label>
      {mark === "keep" && (
        <>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-600">{t("Price (QAR)", "السعر (ر.ق)")}</span>
            <input className={input} type="number" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-stone-600">{t("Description (English)", "الوصف (إنجليزي)")}</span>
            <textarea className={cn(input, "min-h-28")} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>
        </>
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-stone-600">{t("Note to moderator (optional)", "ملاحظة للمشرف (اختياري)")}</span>
        <input className={input} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button onClick={submit} className={cn(btn.primary, "w-full")}>
        {mark === "keep" ? t("Resubmit for moderation", "إعادة الإرسال للمراجعة") : t("Update status", "تحديث الحالة")}
      </button>
      <p className="text-xs text-stone-500">{t("Resubmitted listings return to the moderation queue and stay hidden until approved.", "تعود الإعلانات المعاد إرسالها إلى قائمة المراجعة وتبقى مخفية حتى الموافقة.")}</p>
    </div>
  );
}

// ---------------- Leads ----------------

export function LeadsTab() {
  const { t, href } = useLang();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
        <BadgeCheck className="h-4 w-4 text-brand-600" />
        {t("Every enquiry — web, WhatsApp, portals, AI chat and Meta — lands in one lead list with its source.", "كل استفسار — من الموقع وواتساب والبوابات والمحادثة الذكية وميتا — يصل إلى قائمة واحدة مع مصدره.")}
        <ReqTag id="LED-01" />
        <Link href={href("/advertiser/leads")} className="ms-auto text-xs font-semibold text-brand-600 hover:underline">
          {t("Open full lead manager →", "فتح مدير العملاء الكامل ←")}
        </Link>
      </div>
      <LeadManager compact />
    </div>
  );
}

// ---------------- Billing ----------------

export function BillingTab() {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const acct = useAccount();
  const { plan, isDemoAgency, can, adv } = acct;
  const [view, setView] = useState<Invoice | null>(null);
  const sub = isDemoAgency ? state.subscription : { planId: adv.planId, cycle: "monthly" as const, status: "active" as const, renewsAt: new Date(DEMO_NOW + 30 * DAY).toISOString(), autoRenew: true };
  const price = sub.cycle === "annual" ? plan.monthly * 10 : plan.monthly;

  if (!can.billing)
    return (
      <Card className="grid place-items-center gap-2 p-12 text-center">
        <Lock className="h-8 w-8 text-stone-400" />
        <div className="font-semibold text-stone-800">{t("Billing is restricted to the organisation owner", "الفوترة متاحة لمالك المؤسسة فقط")}</div>
        <p className="text-sm text-stone-500">{t("Switch “Acting as” to the owner to manage the plan and invoices.", "بدّل «بصفة» إلى المالك لإدارة الباقة والفواتير.")}</p>
        <ReqTag id="FR-ACC-02" />
      </Card>
    );

  const toggleRenew = () => {
    if (!isDemoAgency) return toast(t("Auto-renew starts after your first paid plan", "يبدأ التجديد التلقائي بعد أول باقة مدفوعة"));
    update((s) => ({
      ...s,
      subscription: { ...s.subscription, autoRenew: !s.subscription.autoRenew },
      audit: [{ id: uid("A"), at: new Date().toISOString(), actor: acct.actorName, role: "advertiser", action: "subscription.auto_renew", detail: String(!s.subscription.autoRenew) }, ...s.audit],
    }));
    toast(sub.autoRenew ? t("Auto-renew turned off", "تم إيقاف التجديد التلقائي") : t("Auto-renew turned on", "تم تفعيل التجديد التلقائي"));
  };

  const dunning = [
    { d: t("Day 0", "اليوم 0"), text: t("Renewal charge fails → email + WhatsApp notice", "فشل التجديد ← إشعار بالبريد وواتساب") },
    { d: t("Days 1, 3, 5", "الأيام 1، 3، 5"), text: t("Automatic retries on the saved card", "إعادة محاولة تلقائية على البطاقة المحفوظة") },
    { d: t("Days 0–7", "الأيام 0–7"), text: t("Grace period — listings stay live", "فترة سماح — تبقى الإعلانات منشورة") },
    { d: t("Day 8", "اليوم 8"), text: t("Listings paused (never deleted) until payment", "إيقاف الإعلانات مؤقتاً (دون حذف) حتى الدفع") },
  ];
  const featuredUsed = isDemoAgency ? state.subscription.featuredUsed : 0;

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
            {price > 0 ? qar(price, lang) : price === 0 ? t("Free", "مجاناً") : t("Custom quote", "عرض سعر")} / {sub.cycle === "annual" ? t("year", "سنة") : t("month", "شهر")}
          </div>
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">{t("Next renewal", "التجديد القادم")}</span>
              <span className="font-semibold">{gregorian(sub.renewsAt, lang)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-stone-500">{t("Auto-renew", "تجديد تلقائي")}</span>
              <button onClick={toggleRenew} role="switch" aria-checked={sub.autoRenew} className={cn("relative h-6 w-11 rounded-full transition", sub.autoRenew ? "bg-brand-600" : "bg-stone-300")}>
                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", sub.autoRenew ? "start-[22px]" : "start-0.5")} />
              </button>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-stone-500">{t("Payment method", "طريقة الدفع")}</span>
              <span className="font-mono text-xs">{isDemoAgency ? "VISA •••• 1111" : "—"}</span>
            </div>
          </div>
          <Link href={href("/pricing")} className={cn(btn.primary, "mt-4 w-full")}>
            {t("Change plan", "تغيير الباقة")}
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t("Plan limits (enforced server-side)", "حدود الباقة (تُطبق على الخادم)")}</h3>
            <ReqTag id="BIL-09" />
          </div>
          <div className="mt-4 space-y-4">
            <QuotaBar label={t("Active listings", "الإعلانات النشطة")} used={acct.active} max={plan.quotas.listings} />
            <QuotaBar label={t("Featured credits", "أرصدة التمييز")} used={featuredUsed} max={plan.quotas.featuredCredits} />
            <QuotaBar label={t("Team seats", "مقاعد الفريق")} used={Math.max(1, acct.members.length)} max={plan.quotas.seats} />
            <QuotaBar label={t("AI credits this month", "أرصدة الذكاء الاصطناعي")} used={acct.aiUsed} max={plan.quotas.aiCredits} />
            <QuotaBar label={t("Portal connections", "ربط البوابات")} used={state.connections.filter((c) => c.orgId === adv.orgId && c.status === "connected").length} max={plan.quotas.portals} />
          </div>
          <p className="mt-4 rounded-lg bg-sky-50 p-2.5 text-xs text-sky-900">
            {t(
              "External portal listing fees are billed by each portal directly and are never mixed into AqarPro invoices.",
              "رسوم النشر في البوابات الخارجية تُدفع لكل بوابة مباشرة ولا تُضاف إلى فواتير عقار برو.",
            )}
          </p>
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
              {acct.invoices.map((inv) => (
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
              {acct.invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-stone-400">
                    {t("No invoices yet — choose a paid plan to get started.", "لا توجد فواتير بعد — اختر باقة مدفوعة للبدء.")}
                  </td>
                </tr>
              )}
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

export function TeamTab() {
  const { t, p } = useLang();
  const { state, update } = useStore();
  const { adv, plan, members, can, actorName, session } = useAccount();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "agent" as OrgRole });

  const audit = (action: string, target: string, detail?: string) => ({ id: uid("A"), at: new Date().toISOString(), actor: actorName, role: "advertiser" as const, action, target, detail });

  const invite = () => {
    if (members.length >= plan.quotas.seats) return toast(t("Seat limit reached — upgrade plan", "تم بلوغ حد المقاعد — قم بترقية الباقة"));
    if (!form.name || !form.email) return;
    update((s) => ({
      ...s,
      team: [...s.team, { id: uid("TM"), orgId: adv.orgId, name: form.name, email: form.email, role: form.role, status: "invited" }],
      notifications: [notification({ channel: "email", to: form.email, template: "team_invitation" }), ...s.notifications],
      audit: [audit("team.invited", form.email, form.role), ...s.audit],
    }));
    toast(t(`Invitation sent to ${form.email}`, `تم إرسال الدعوة إلى ${form.email}`));
    setForm({ name: "", email: "", role: "agent" });
    setOpen(false);
  };

  const changeRole = (id: string, role: OrgRole) => {
    update((s) => ({ ...s, team: s.team.map((m) => (m.id === id ? { ...m, role } : m)), audit: [audit("team.role_changed", id, role), ...s.audit] }));
    toast(t("Role updated", "تم تحديث الدور"));
  };
  const remove = (id: string) => {
    update((s) => ({
      ...s,
      team: s.team.filter((m) => m.id !== id),
      listings: s.listings.map((l) => (l.assignedAgentId === id ? { ...l, assignedAgentId: undefined } : l)),
      audit: [audit("team.removed", id), ...s.audit],
    }));
    toast(t("Member removed — their listings are now unassigned", "تمت إزالة العضو — أصبحت إعلاناته غير مسندة"));
  };

  const roles: OrgRole[] = ["owner", "manager", "agent", "readonly"];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="overflow-hidden lg:col-span-2">
        <div className="flex items-center justify-between border-b border-stone-100 p-4">
          <div>
            <h3 className="font-semibold text-stone-900">{t("Team members", "أعضاء الفريق")}</h3>
            <p className="text-xs text-stone-500">
              {members.length} / {plan.quotas.seats} {t("seats used", "مقعد مستخدم")} · {t("organisation", "المؤسسة")} <span className="font-mono">{adv.orgId}</span>
            </p>
          </div>
          <button onClick={() => setOpen(true)} disabled={!can.team} title={can.team ? undefined : t("Only the owner can invite members", "المالك فقط يمكنه دعوة الأعضاء")} className={btn.primary}>
            <UserPlus className="h-4 w-4" />
            {t("Invite", "دعوة")}
          </button>
        </div>
        <div className="divide-y divide-stone-100">
          {members.map((m) => {
            const assigned = state.listings.filter((l) => l.assignedAgentId === m.id).length;
            return (
              <div key={m.id} className={cn("flex flex-wrap items-center gap-3 p-4", m.id === session.memberId && "bg-brand-50/40")}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-stone-200 text-xs font-bold text-stone-700">
                  {m.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-stone-900">
                    {m.name} {m.id === session.memberId && <span className="text-xs text-brand-600">({t("you", "أنت")})</span>}
                  </div>
                  <div className="text-xs text-stone-500">{m.email}</div>
                </div>
                <span className="hidden text-xs text-stone-500 sm:block">
                  {assigned} {t("listings", "إعلانات")}
                </span>
                {m.status === "invited" && <Badge tone="amber">{t("Invited", "مدعو")}</Badge>}
                {can.team && m.role !== "owner" ? (
                  <>
                    <select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as OrgRole)} className="rounded-lg border border-stone-200 px-2 py-1 text-xs">
                      {roles.filter((r) => r !== "owner").map((r) => (
                        <option key={r} value={r}>
                          {p(roleName[r])}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => remove(m.id)} aria-label={t("Remove", "إزالة")} className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Badge tone={m.role === "owner" ? "brand" : "stone"}>{p(roleName[m.role])}</Badge>
                )}
              </div>
            );
          })}
          {members.length === 0 && <div className="p-8 text-center text-sm text-stone-400">{t("Individual account — one seat.", "حساب فردي — مقعد واحد.")}</div>}
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
              {roles.map((r) => (
                <th key={r} className="py-2 text-center font-medium">{p(roleName[r])}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {permissionRows.map((row) => (
              <tr key={row.key}>
                <td className="py-2 text-stone-700">{p(row.label)}</td>
                {roles.map((r) => (
                  <td key={r} className="py-2 text-center">{permissionsFor(r)[row.key] ? "✓" : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-stone-500">{t("Agents see only listings and leads assigned to them. Data is scoped to the organisation (tenant isolation).", "يرى الوكيل الإعلانات والعملاء المسندين إليه فقط. البيانات محصورة في المؤسسة.")}</p>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t("Invite a team member", "دعوة عضو للفريق")}>
        <div className="space-y-3">
          <input className={input} placeholder={t("Full name", "الاسم الكامل")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={input} placeholder="name@agency.qa" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as OrgRole })}>
            {roles.filter((r) => r !== "owner").map((r) => (
              <option key={r} value={r}>
                {p(roleName[r])}
              </option>
            ))}
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

// ---------------- Verification & compliance ----------------

const DAY_MS = 86400000;

export function complianceState(c: ComplianceItem, now: number): ComplianceItem["status"] {
  if (!c.expiresAt) return c.status === "missing" ? "missing" : c.status;
  const days = (new Date(c.expiresAt).getTime() - now) / DAY_MS;
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

export function VerificationTab() {
  const { lang, t, p, href } = useLang();
  const { state, update } = useStore();
  const { adv, can, actorName } = useAccount();
  const v = state.verifications.filter((x) => x.advertiserId === adv.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const items = state.compliance.filter((c) => c.orgId === adv.orgId);
  const [editing, setEditing] = useState<ComplianceItem | null>(null);
  const [form, setForm] = useState({ number: "", expiresAt: "", file: "" });

  const save = () => {
    if (!editing) return;
    const expiresAt = form.expiresAt ? new Date(form.expiresAt).toISOString() : editing.expiresAt;
    const next: ComplianceItem = { ...editing, number: form.number || editing.number, expiresAt, status: "valid" };
    next.status = complianceState(next, DEMO_NOW);
    update((s) => ({
      ...s,
      compliance: s.compliance.map((c) => (c.id === editing.id ? next : c)),
      audit: [{ id: uid("A"), at: new Date().toISOString(), actor: actorName, role: "advertiser", action: "compliance.document_updated", target: editing.id, detail: `${editing.docType}${form.file ? `; ${form.file}` : ""}` }, ...s.audit],
    }));
    toast(t("Document updated", "تم تحديث المستند"));
    setEditing(null);
  };

  const tone = { valid: "green", expiring: "amber", expired: "red", missing: "stone" } as const;
  const label = {
    valid: t("Valid", "ساري"),
    expiring: t("Expiring soon", "ينتهي قريباً"),
    expired: t("Expired", "منتهي"),
    missing: t("Missing", "مفقود"),
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="p-6 text-center">
        {adv.verified ? <BadgeCheck className="mx-auto h-14 w-14 text-sky-600" /> : <ShieldCheck className="mx-auto h-14 w-14 text-amber-500" />}
        <h3 className="mt-3 text-lg font-bold text-stone-900">
          {adv.verified ? (adv.kind === "agency" ? t("Verified agency", "وكالة موثقة") : t("Verified owner", "مالك موثق")) : v?.status === "rejected" ? t("Verification rejected", "رُفض التوثيق") : t("Verification pending", "التوثيق قيد المراجعة")}
        </h3>
        <p className="mt-1 text-sm text-stone-500">
          {p(adv.name)} · {t("since", "منذ")} {gregorian(adv.memberSince, lang)}
        </p>
        {v && (
          <div className="mt-4 space-y-1.5 text-start text-xs">
            {v.docs.map((d) => (
              <div key={d.name} className="flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5">
                <FileText className="h-3.5 w-3.5 text-stone-400" />
                <span className="flex-1 text-stone-700">{d.type}</span>
                <span className="font-mono text-stone-500">{d.name}</span>
              </div>
            ))}
            {v.decidedBy && (
              <div className="text-stone-500">
                {v.status === "approved" ? t("Approved by", "اعتمده") : t("Reviewed by", "راجعه")} {v.decidedBy} · {v.decidedAt && gregorian(v.decidedAt, lang)}
              </div>
            )}
            {v.reason && <div className="text-red-700">{v.reason}</div>}
          </div>
        )}
        <div className="mt-3 flex justify-center gap-1.5">
          <ReqTag id="FR-ACC-03" />
          <ReqTag id="NFR-LEG-01" />
        </div>
        {!adv.verified && (
          <Link href={href("/admin?tab=verification")} target="_blank" className="mt-3 inline-block text-xs font-semibold text-brand-600 hover:underline">
            {t("Demo: approve as moderator →", "عرض: الموافقة كمشرف ←")}
          </Link>
        )}
      </Card>
      <Card className="overflow-hidden lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 p-4">
          <h3 className="font-semibold text-stone-900">{t("Compliance checklist", "قائمة الامتثال")}</h3>
          <StageBadge s="S1" />
          <ReqTag id="CMP-01" />
          <span className="ms-auto text-xs text-stone-500">{t("Reminders 30, 7 and 1 days before expiry", "تذكير قبل 30 و7 ويوم واحد من الانتهاء")}</span>
        </div>
        <div className="divide-y divide-stone-100">
          {items.map((c) => {
            const st = complianceState(c, DEMO_NOW);
            return (
              <div key={c.id} className={cn("flex flex-wrap items-center gap-3 p-4", st === "expiring" && "bg-amber-50/60", st === "expired" && "bg-red-50/60")}>
                <FileText className="h-5 w-5 text-stone-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-stone-900">{p(c.label)}</div>
                  <div className="font-mono text-xs text-stone-500">
                    {c.number ?? "—"}
                    {c.expiresAt && ` · ${t("expires", "ينتهي")} ${gregorian(c.expiresAt, lang)}`}
                  </div>
                </div>
                <Badge tone={tone[st]}>{label[st]}</Badge>
                <button
                  disabled={!can.edit}
                  onClick={() => {
                    setEditing(c);
                    setForm({ number: c.number ?? "", expiresAt: c.expiresAt?.slice(0, 10) ?? "", file: "" });
                  }}
                  className={cn(btn.secondary, "py-1 text-xs")}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {st === "missing" ? t("Upload", "رفع") : t("Update", "تحديث")}
                </button>
              </div>
            );
          })}
          {items.length === 0 && <div className="p-8 text-center text-sm text-stone-400">{t("No compliance documents configured.", "لا توجد مستندات امتثال.")}</div>}
        </div>
        <div className="flex items-start gap-2 border-t border-stone-100 p-4 text-xs text-stone-500">
          <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t(
            "Documents are stored encrypted and visible only to AqarPro moderators. Software checks are reminders only — they are never presented as government or legal approval.",
            "تُخزن المستندات مشفرة ولا يراها إلا مشرفو عقار برو. فحوصات النظام تذكيرات فقط — ولا تُقدَّم أبداً كموافقة حكومية أو قانونية.",
          )}
        </div>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? p(editing.label) : ""}>
        <div className="space-y-3">
          <input className={input} placeholder={t("Document number", "رقم المستند")} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <label className="block text-xs font-semibold text-stone-600">
            {t("Expiry date", "تاريخ الانتهاء")}
            <input type="date" className={cn(input, "mt-1")} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 p-3 text-sm text-stone-600 hover:bg-stone-50">
            <Upload className="h-4 w-4" />
            {form.file || t("Choose file (simulated upload)", "اختر ملفاً (رفع تجريبي)")}
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && setForm({ ...form, file: e.target.files[0].name })} />
          </label>
          <button onClick={save} className={cn(btn.primary, "w-full")}>
            {t("Save", "حفظ")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
