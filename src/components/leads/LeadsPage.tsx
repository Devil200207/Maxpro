"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { advertiserById } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { PageTitle, ReqTag } from "../ui";
import { LeadManager } from "./LeadManager";

export function LeadsPage() {
  const { t, p, href } = useLang();
  const { state } = useStore();
  const org = advertiserById(state.session.advertiserId);
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <Link href={href("/advertiser")} className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="flip-rtl h-4 w-4" />
        {t("Agency dashboard", "لوحة الوكالة")}
      </Link>
      <PageTitle
        title={t("Lead manager", "إدارة العملاء")}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {p(org.name)} · {t("every enquiry from the website, WhatsApp, AI chat, Meta and portals in one place", "كل الاستفسارات من الموقع وواتساب والمحادثة الذكية وميتا والبوابات في مكان واحد")}
            <ReqTag id="LED-01" />
            <ReqTag id="LED-02" />
            <ReqTag id="LED-06" />
          </span>
        }
      />
      <LeadManager />
    </div>
  );
}
