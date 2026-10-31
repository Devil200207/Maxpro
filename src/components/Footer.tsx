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
      h: t("Property", "العقارات"),
      links: [
        [t("Apartments for rent", "شقق للإيجار"), "/search?purpose=rent&type=apartment"],
        [t("Villas for rent", "فلل للإيجار"), "/search?purpose=rent&type=villa"],
        [t("Property for sale", "عقارات للبيع"), "/search?purpose=sale"],
        [t("Map search", "البحث بالخريطة"), "/search?view=map"],
      ],
    },
    {
      h: t("Advertisers", "المعلنون"),
      links: [
        [t("Plans & pricing", "الباقات والأسعار"), "/pricing"],
        [t("Post a listing", "أضف إعلان"), "/advertiser/new"],
        [t("Advertiser dashboard", "لوحة المعلن"), "/advertiser"],
      ],
    },
    {
      h: t("AqarPro", "عقار برو"),
      links: [
        [t("Demo guide", "دليل العرض"), "/demo"],
        [t("Roadmap by stage", "خارطة الطريق"), "/roadmap"],
        [t("Prototype audit", "تدقيق النموذج"), "/audit"],
        [t("Contact", "اتصل بنا"), "/demo"],
      ],
    },
  ];
  return (
    <footer className="mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto grid grid-cols-1 max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <Logo className="h-10 w-auto" />
          <p className="mt-3 text-sm text-stone-500">
            {t("One bilingual workspace to create, market, distribute and enquire about property in Qatar.", "مساحة عمل ثنائية اللغة لإنشاء العقارات وتسويقها ونشرها والاستفسار عنها في قطر.")}
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
