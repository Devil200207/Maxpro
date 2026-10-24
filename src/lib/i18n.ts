export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const isLocale = (s: string): s is Locale =>
  (locales as readonly string[]).includes(s);

/** Bilingual string, stored side by side as the brief requires (FR-LST-02). */
export type Bi = { en: string; ar: string };

export const pick = (l: Locale, b: Bi) => b[l];
export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");

/** Inline translation helper: tr(lang, "Search", "بحث"). */
export const tr = (l: Locale, en: string, ar: string) => (l === "ar" ? ar : en);
