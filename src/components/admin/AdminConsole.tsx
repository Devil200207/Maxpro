"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  BrainCircuit,
  FileCheck2,
  Network,
  Flag,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  ToggleLeft,
  UserCheck,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { Badge, cn } from "@/components/ui";
import { Overview } from "./Overview";
import { ComplianceAdmin, ModerationQueue, Reports, Verification } from "./Moderation";
import { HubDashboard } from "@/components/hub/HubDashboard";
import { AdInventory, FeatureFlags, PlansEditor } from "./Config";
import { AiConsole, AuditTrail, Notifications } from "./Ops";

const TABS = [
  { id: "dashboard", icon: LayoutDashboard, en: "Dashboard", ar: "لوحة المؤشرات" },
  { id: "moderation", icon: ListChecks, en: "Moderation queue", ar: "قائمة المراجعة" },
  { id: "reports", icon: Flag, en: "Reports", ar: "البلاغات" },
  { id: "verification", icon: UserCheck, en: "Verification", ar: "التوثيق" },
  { id: "hub", icon: Network, en: "Portal Hub", ar: "مركز البوابات" },
  { id: "compliance", icon: FileCheck2, en: "Compliance", ar: "الامتثال" },
  { id: "plans", icon: SlidersHorizontal, en: "Plans & pricing", ar: "الباقات والأسعار" },
  { id: "ads", icon: Megaphone, en: "Ad inventory", ar: "المساحات الإعلانية" },
  { id: "notifications", icon: Bell, en: "Notifications", ar: "الإشعارات" },
  { id: "ai", icon: BrainCircuit, en: "AI console", ar: "وحدة الذكاء الاصطناعي" },
  { id: "audit", icon: ScrollText, en: "Audit trail", ar: "سجل التدقيق" },
  { id: "flags", icon: ToggleLeft, en: "Feature flags", ar: "مفاتيح الميزات" },
] as const;

export type AdminTab = (typeof TABS)[number]["id"];

export function AdminConsole() {
  const { t } = useLang();
  const { state } = useStore();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = sp.get("tab");
  const tab: AdminTab = TABS.some((x) => x.id === raw) ? (raw as AdminTab) : "dashboard";
  const go = (id: AdminTab) => router.replace(`${pathname}?tab=${id}`, { scroll: false });

  const pending = state.listings.filter((l) => l.status === "pending").length;
  const hubIssues = state.portalListings.filter((x) => x.status === "needs_fix" || x.status === "failed" || x.status === "timeout").length;
  const badges: Partial<Record<AdminTab, number>> = {
    moderation: pending,
    verification: state.verifications.filter((v) => v.status === "pending").length,
    reports: state.reports.filter((r) => r.status === "open" || (r.status === "resubmitted" && !r.resolvedAt)).length,
    hub: hubIssues,
    compliance: state.compliance.filter((c) => c.status !== "valid").length,
  };

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-4 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-accent-400" />
          <div>
            <div className="text-sm font-bold">{t("AqarPro back office", "لوحة إدارة عقار برو")}</div>
            <div className="text-[11px] text-stone-400">{t("Administrator · full configuration access", "مدير النظام · صلاحيات كاملة")}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300">
            ✓ {t("Signed in with 2FA", "دخول بالتحقق الثنائي")} <span className="ms-1 font-mono text-[10px] opacity-70">FR-ACC-05</span>
          </span>
          <span className="hidden rounded-full bg-white/10 px-2.5 py-1 sm:inline">admin@aqarpro.qa</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-visible">
          {TABS.map((x) => (
            <button
              key={x.id}
              onClick={() => go(x.id)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-medium transition",
                tab === x.id ? "bg-brand-600 text-white shadow-sm" : "text-stone-700 hover:bg-stone-100",
              )}
            >
              <x.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 whitespace-nowrap">{t(x.en, x.ar)}</span>
              {!!badges[x.id] && (
                <Badge className={cn("text-[10px]", tab === x.id ? "bg-white/20 text-white" : "bg-brand-100 text-brand-700")}>{badges[x.id]}</Badge>
              )}
            </button>
          ))}
        </nav>

        <section className="min-w-0">
          {tab === "dashboard" && <Overview go={go} />}
          {tab === "moderation" && <ModerationQueue />}
          {tab === "reports" && <Reports />}
          {tab === "verification" && <Verification />}
          {tab === "hub" && <HubDashboard scope="admin" />}
          {tab === "compliance" && <ComplianceAdmin />}
          {tab === "plans" && <PlansEditor />}
          {tab === "ads" && <AdInventory />}
          {tab === "notifications" && <Notifications />}
          {tab === "ai" && <AiConsole />}
          {tab === "audit" && <AuditTrail />}
          {tab === "flags" && <FeatureFlags />}
        </section>
      </div>
    </div>
  );
}
