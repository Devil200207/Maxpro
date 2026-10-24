"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, CheckCircle2, PlusCircle, X } from "lucide-react";
import { btn, cn, PageTitle } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { advertiserById, DEMO_ADVERTISER_ID, planById } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { BillingTab, LeadsTab, ListingsTab, OverviewTab, TeamTab, VerificationTab } from "@/components/advertiser/DashboardTabs";

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
  const adv = advertiserById(DEMO_ADVERTISER_ID);
  const plan = planById(state.subscription.planId);
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
    verification: t("Verification", "التوثيق"),
  };
  const newLeads = state.leads.filter((l) => l.advertiserId === DEMO_ADVERTISER_ID && l.status === "new").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {showBanner && submitted && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <div className="font-semibold">{t("Listing submitted for moderation", "تم إرسال الإعلان للمراجعة")} · {submitted}</div>
            <div className="mt-0.5 text-emerald-800">
              {t("Automatic checks passed. A moderator will review it — open the Admin portal in another tab to approve it live.", "اجتاز الفحوصات التلقائية. سيراجعه أحد المشرفين — افتح بوابة الإدارة في تبويب آخر للموافقة عليه مباشرة.")}{" "}
              <Link href={href("/admin")} className="font-semibold underline">
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
        subtitle={`${t("Advertiser portal", "بوابة المعلن")} · ${t("Plan", "الباقة")}: ${p(plan.name)} · ${t("Agency account with team seats", "حساب وكالة مع مستخدمين")}`}
        actions={
          <Link href={href("/advertiser/new")} className={btn.primary}>
            <PlusCircle className="h-4 w-4" />
            {t("Post a listing", "أضف إعلان")}
          </Link>
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
