"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { btn, PageTitle, ReqTag } from "@/components/ui";
import { StageBadge } from "@/lib/stage";
import { useLang } from "@/lib/useLang";
import { HubDashboard } from "./HubDashboard";
import { ActingAs } from "./parts";

export function HubPage() {
  const sp = useSearchParams();
  const { t, href } = useLang();
  const focus = sp.get("listing") ?? undefined;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t("Portal Integration Hub", "مركز ربط البوابات")} <StageBadge s="S1" />
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {t(
              "One canonical listing, many portals: mapped versions, validation, a durable job queue, safe retries and full history.",
              "إعلان أساسي واحد وبوابات متعددة: نسخ محوّلة، تحقق، طابور مهام دائم، إعادة آمنة وسجل كامل.",
            )}
            <ReqTag id="HUB-01" />
            <ReqTag id="FR-LST-12" />
          </span>
        }
        actions={
          <>
            <ActingAs />
            <Link href={href("/advertiser/studio")} className={btn.primary}>
              <Sparkles className="h-4 w-4" />
              {t("New listing with AI Studio", "إعلان جديد بالاستوديو الذكي")}
            </Link>
          </>
        }
      />
      <HubDashboard key={focus ?? "all"} scope="agency" focusListingId={focus} />
    </div>
  );
}
