"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { useLang } from "@/lib/useLang";
import { useStore } from "@/lib/store";

export function Footer() {
  const { t, href } = useLang();
  const { reset } = useStore();
  const cols = [
    {
      h: t("Services", "الخدمات"),
      links: [
        [t("AI Listing Studio", "استوديو الإعلانات الذكي"), "/advertiser/studio"],
        [t("Portal connectors", "ربط البوابات"), "/hub"],
        [t("Help desk AI", "مساعد الدعم الذكي"), "/whatsapp"],
        [t("Marketing AI", "التسويق الذكي"), "/advertiser"],
      ],
    },
    {
      h: t("Builders & agencies", "المطورون والوكالات"),
      links: [
        [t("Plans & pricing", "الباقات والأسعار"), "/pricing"],
        [t("Get started", "ابدأ الآن"), "/register"],
        [t("Agency dashboard", "لوحة الوكالة"), "/advertiser"],
      ],
    },
    {
      h: t("AqarPro", "عقار برو"),
      links: [
        [t("About", "من نحن"), "/"],
        [t("Terms", "الشروط"), "/"],
        [t("Privacy", "الخصوصية"), "/"],
        [t("Contact", "اتصل بنا"), "/"],
      ],
    },
  ];
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <Logo className="h-10 w-auto" />
          <p className="mt-3 text-sm text-stone-500">
            {t("The bridge between builders, agencies and Qatar's property portals.", "حلقة الوصل بين المطورين والوكالات وبوابات العقارات في قطر.")}
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h3 className="text-sm font-semibold text-stone-900">{c.h}</h3>
            <ul className="mt-3 space-y-2">
              {c.links.map(([label, to]) => (
                <li key={label}>
                  <Link href={href(to)} className="text-sm text-stone-500 hover:text-brand-600">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-stone-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-400 sm:px-6">
          <span>{t("Interactive prototype — demo data only", "نموذج تفاعلي — بيانات تجريبية فقط")} · © 2026 AqarPro</span>
          <button onClick={reset} className="underline hover:text-stone-600">
            {t("Reset demo data", "إعادة ضبط بيانات العرض")}
          </button>
        </div>
      </div>
    </footer>
  );
}
