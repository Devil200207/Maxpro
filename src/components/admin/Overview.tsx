"use client";

import { ArrowRight, Building2, Inbox, ListChecks, MessageCircle, UserPlus, Wallet } from "lucide-react";
import { plans, type ListingStatus } from "@/lib/data";
import { num, qar, timeAgo } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { btn, Card, cn, Stat } from "@/components/ui";
import { useNow } from "@/components/inbox/channel";
import { SectionHead } from "./shared";
import type { AdminTab } from "./AdminConsole";

// Sample subscriber counts per plan (demo figures).
const SUBSCRIBERS: Record<string, number> = { starter: 318, professional: 86, agency: 14, enterprise: 3 };
const ENTERPRISE_AVG = 6500;

const STATUS_META: { id: ListingStatus; en: string; ar: string; cls: string }[] = [
  { id: "live", en: "Live", ar: "منشور", cls: "bg-emerald-500" },
  { id: "pending", en: "Pending", ar: "قيد المراجعة", cls: "bg-amber-400" },
  { id: "draft", en: "Draft / changes", ar: "مسودة", cls: "bg-stone-400" },
  { id: "paused", en: "Paused", ar: "متوقف", cls: "bg-sky-400" },
  { id: "rejected", en: "Rejected", ar: "مرفوض", cls: "bg-red-500" },
  { id: "rented", en: "Rented", ar: "مؤجر", cls: "bg-violet-500" },
  { id: "sold", en: "Sold", ar: "مباع", cls: "bg-violet-700" },
  { id: "expired", en: "Expired", ar: "منتهي", cls: "bg-stone-300" },
];

const ROLE_CLS: Record<string, string> = {
  admin: "bg-stone-900 text-white",
  moderator: "bg-sky-100 text-sky-800",
  agent: "bg-brand-100 text-brand-700",
  ai: "bg-violet-100 text-violet-800",
  advertiser: "bg-amber-100 text-amber-800",
  system: "bg-stone-100 text-stone-600",
};
export const roleCls = (r: string) => ROLE_CLS[r] ?? ROLE_CLS.system;

export function Overview({ go }: { go: (t: AdminTab) => void }) {
  const { lang, t, p } = useLang();
  const { state } = useStore();
  const now = useNow(30000);

  const live = state.listings.filter((l) => l.status === "live").length;
  const pending = state.listings.filter((l) => l.status === "pending").length;
  const backlog = state.conversations.filter((c) => c.status === "open" || c.status === "pending").length;
  const waToday = 46 + state.conversations.filter((c) => c.channel === "whatsapp").length;
  const revenue = plans.map((pl) => ({
    plan: pl,
    mrr: (pl.monthly === -1 ? ENTERPRISE_AVG : pl.monthly) * SUBSCRIBERS[pl.id],
  }));
  const mrr = revenue.reduce((a, r) => a + r.mrr, 0);
  const maxRev = Math.max(...revenue.map((r) => r.mrr));

  const counts = STATUS_META.map((s) => ({ ...s, n: state.listings.filter((l) => l.status === s.id).length })).filter((s) => s.n > 0 || s.id === "pending");
  const maxCount = Math.max(1, ...counts.map((c) => c.n));

  return (
    <div>
      <SectionHead title={t("Dashboard", "لوحة المؤشرات")} desc={t("Platform health at a glance. Revenue and user figures are sample data.", "نظرة سريعة على أداء المنصة. أرقام الإيرادات والمستخدمين تجريبية.")} req={["FR-ADM-01"]} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t("Live listings", "الإعلانات المنشورة")} value={num(live, lang)} icon={<Building2 className="h-4 w-4 text-stone-400" />} hint={t("Target 50,000 capacity", "سعة مستهدفة 50,000")} />
        <Stat label={t("Pending moderation", "بانتظار المراجعة")} value={<span className={pending ? "text-amber-600" : ""}>{pending}</span>} icon={<ListChecks className="h-4 w-4 text-stone-400" />} hint={t("SLA 2 working hours", "خلال ساعتي عمل")} />
        <Stat label={t("New users (7 days)", "مستخدمون جدد (7 أيام)")} value="148" icon={<UserPlus className="h-4 w-4 text-stone-400" />} hint={<span className="text-emerald-600">▲ 12%</span>} />
        <Stat label="MRR" value={qar(mrr, lang)} icon={<Wallet className="h-4 w-4 text-stone-400" />} hint={<span className="text-emerald-600">▲ 8.4% {t("MoM", "شهرياً")}</span>} />
        <Stat label={t("WhatsApp conversations today", "محادثات واتساب اليوم")} value={waToday} icon={<MessageCircle className="h-4 w-4 text-wa-600" />} hint={t("71% resolved by AI", "71٪ حلها الذكاء الاصطناعي")} />
        <Stat label={t("Support backlog", "طلبات الدعم المفتوحة")} value={backlog} icon={<Inbox className="h-4 w-4 text-stone-400" />} hint={t("Open conversations", "محادثات مفتوحة")} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">{t("Listings by status", "الإعلانات حسب الحالة")}</h3>
            <button onClick={() => go("moderation")} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
              {t("Open queue", "فتح قائمة المراجعة")} <ArrowRight className="flip-rtl h-3 w-3" />
            </button>
          </div>
          <div className="mt-4 space-y-2.5">
            {counts.map((c) => (
              <div key={c.id} className="grid grid-cols-[110px_1fr_32px] items-center gap-3 text-sm">
                <span className="text-stone-600">{t(c.en, c.ar)}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                  <div className={cn("h-full rounded-full", c.cls)} style={{ width: `${(c.n / maxCount) * 100}%` }} />
                </div>
                <span className="text-end font-semibold tabular-nums text-stone-900">{c.n}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-stone-900">{t("Monthly recurring revenue by plan", "الإيرادات الشهرية حسب الباقة")}</h3>
          <svg viewBox="0 0 400 170" className="mt-3 w-full" role="img" aria-label="Revenue by plan">
            {revenue.map((r, i) => {
              const h = maxRev ? (r.mrr / maxRev) * 110 : 0;
              const x = 30 + i * 95;
              return (
                <g key={r.plan.id}>
                  <rect x={x} y={130 - h} width="56" height={Math.max(h, 2)} rx="6" className={r.plan.highlight ? "fill-brand-600" : "fill-brand-200"} />
                  <text x={x + 28} y={124 - h} textAnchor="middle" className="fill-stone-700 text-[11px] font-semibold">
                    {r.mrr >= 1000 ? `${Math.round(r.mrr / 1000)}k` : r.mrr}
                  </text>
                  <text x={x + 28} y="148" textAnchor="middle" className="fill-stone-500 text-[11px]">
                    {p(r.plan.name)}
                  </text>
                  <text x={x + 28} y="163" textAnchor="middle" className="fill-stone-400 text-[10px]">
                    {SUBSCRIBERS[r.plan.id]} {t("subs", "مشترك")}
                  </text>
                </g>
              );
            })}
            <line x1="20" y1="130" x2="390" y2="130" className="stroke-stone-200" />
          </svg>
          <p className="text-[11px] text-stone-400">{t("QAR / month · sample subscriber counts", "ر.ق شهرياً · أعداد مشتركين تجريبية")}</p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-900">{t("Recent activity", "النشاط الأخير")}</h3>
          <button onClick={() => go("audit")} className={cn(btn.ghost, "py-1 text-xs")}>
            {t("Full audit trail", "سجل التدقيق الكامل")}
          </button>
        </div>
        <ul className="mt-3 divide-y divide-stone-100">
          {state.audit.slice(0, 7).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", roleCls(a.role))}>{a.role}</span>
              <span className="font-medium text-stone-800">{a.actor}</span>
              <span className="font-mono text-xs text-stone-600">{a.action}</span>
              {a.target && <span className="font-mono text-xs text-brand-700">{a.target}</span>}
              <span className="ms-auto text-xs text-stone-400">{now ? timeAgo(a.at, lang) : ""}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
