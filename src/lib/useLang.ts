"use client";

import { useParams } from "next/navigation";
import { dirOf, isLocale, type Bi, type Locale } from "./i18n";

/** Client-side locale helpers. All UI copy is inline: t("Search", "بحث"). */
export function useLang() {
  const params = useParams<{ lang: string }>();
  const lang: Locale = params?.lang && isLocale(params.lang) ? params.lang : "en";
  return {
    lang,
    dir: dirOf(lang),
    isAr: lang === "ar",
    t: (en: string, ar: string) => (lang === "ar" ? ar : en),
    p: (b: Bi) => b[lang],
    href: (path: string) => `/${lang}${path === "/" ? "" : path}`,
  };
}
