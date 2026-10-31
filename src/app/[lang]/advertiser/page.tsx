"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, CheckCircle2, PlusCircle, X } from "lucide-react";
import { btn, cn, PageTitle } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { BillingTab, LeadsTab, ListingsTab, OverviewTab, TeamTab, VerificationTab } from "@/components/advertiser/DashboardTabs";
import { AccountBar, VerificationBanner } from "@/components/account/AccountBar";
import { roleName, useAccount } from "@/components/account/useAccount";
import { StageBadge } from "@/lib/stage";

const TABS = ["overview", "listings", "leads", "billing", "team", "verification"] as const;
type Tab = (typeof TABS)[number];

export default function AdvertiserPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10 text-stone-400">…</div>}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const { t, p, href, lang } = useLang();
  const sp = useSearchParams();
  const router = useRouter();
  const { state } = useStore();
  const { adv, plan, role, can } = useAccount();
  const initial = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "overview";
  const [tab, setTab] = useState<Tab>(initial);
  const submitted = sp.get("submitted");
  const [showBanner, setShowBanner] = useState(!!submitted);

  useEffect(() => {
    if (submitted) toast(t(`Listing ${submitted} submitted for moderation`, `تم إرسال الإعلان ${submitted} للمراجعة`));
    // run once per arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const go = (k: Tab) => {
    setTab(k);
    router.replace(`/${lang}/advertiser?tab=${k}`, { scroll: false });
  };

  const labels: Record<Tab, string> = {
    overview: t("Overview", "نظرة عامة"),
    listings: t("Listings", "الإعلانات"),
    leads: t("Leads", "العملاء"),
    billing: t("Billing", "الفوترة"),
    team: t("Team", "الفريق"),
    verification: t("Verification & compliance", "التوثيق والامتثال"),
  };
  const newLeads = state.leads.filter((l) => l.advertiserId === adv.id && l.status === "new").length;
  const actionNeeded = state.reports.filter((r) => r.status === "actioned" && state.listings.find((l) => l.id === r.listingId)?.advertiserId === adv.id).length;
  const expiring = state.compliance.filter((c) => c.orgId === adv.orgId && (c.status === "expiring" || c.status === "expired" || c.status === "missing")).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AccountBar />
      <VerificationBanner />
      {showBanner && submitted && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <div className="font-semibold">{t("Listing submitted for moderation", "تم إرسال الإعلان للمراجعة")} · {submitted}</div>
            <div className="mt-0.5 text-emerald-800">
              {t("Automatic checks passed and plan quota enforced. A moderator will review it — open the Admin portal in another tab to approve it live.", "اجتاز الفحوصات التلقائية وحد الباقة. سيراجعه أحد المشرفين — افتح بوابة الإدارة في تبويب آخر للموافقة عليه مباشرة.")}{" "}
              <Link href={href("/admin?tab=moderation")} target="_blank" className="font-semibold underline">
                {t("Open moderation queue", "فتح قائمة المراجعة")}
              </Link>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} aria-label="Dismiss" className="text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <PageTitle
        title={
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: adv.color }}>
              {adv.initials}
            </span>
            <span>
              {p(adv.name)}
              {adv.verified && <BadgeCheck className="ms-2 inline h-5 w-5 text-sky-600" />}
            </span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {t("Advertiser portal", "بوابة المعلن")} · {t("Plan", "الباقة")}: {p(plan.name)} · {adv.kind === "agency" ? t("Agency organisation", "مؤسسة وكالة") : t("Individual account", "حساب فردي")} ·{" "}
            {t("Signed in as", "بصفة")} {p(roleName[role])}
            <StageBadge s="S1" />
          </span>
        }
        actions={
          can.edit ? (
            <>
              <Link href={href("/advertiser/studio")} className={btn.secondary}>
                {t("AI Listing Studio", "استوديو الإعلانات الذكي")}
              </Link>
              <Link href={href("/advertiser/new")} className={btn.primary}>
                <PlusCircle className="h-4 w-4" />
                {t("Post a listing", "أضف إعلان")}
              </Link>
            </>
          ) : undefined
        }
      />

      <div className="scrollbar-none -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0">
        {TABS.map((k) => (
          <button
            key={k}
            onClick={() => go(k)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition",
              tab === k ? "text-brand-700" : "text-stone-500 hover:text-stone-800",
            )}
          >
            {labels[k]}
            {k === "leads" && newLeads > 0 && <span className="ms-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">{newLeads}</span>}
            {k === "listings" && actionNeeded > 0 && <span className="ms-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">{actionNeeded}</span>}
            {k === "verification" && expiring > 0 && <span className="ms-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white">{expiring}</span>}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "listings" && <ListingsTab />}
      {tab === "leads" && <LeadsTab />}
      {tab === "billing" && <BillingTab />}
      {tab === "team" && <TeamTab />}
      {tab === "verification" && <VerificationTab />}
    </div>
  );
}
