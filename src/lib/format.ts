import type { Locale } from "./i18n";

// Western digits in both languages, as most Qatari portals do.
const nf = (l: Locale) => new Intl.NumberFormat(l === "ar" ? "ar-QA-u-nu-latn" : "en-US");

export const num = (n: number, l: Locale) => nf(l).format(n);

export function qar(n: number, l: Locale) {
  return l === "ar" ? `${num(n, l)} ر.ق` : `QAR ${num(n, l)}`;
}

export function compactQar(n: number, l: Locale) {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/\.?0+$/, "");
    return l === "ar" ? `${v} مليون ر.ق` : `QAR ${v}M`;
  }
  return qar(n, l);
}

export function priceLabel(price: number, purpose: "rent" | "sale", l: Locale) {
  const base = qar(price, l);
  if (purpose === "sale") return base;
  return l === "ar" ? `${base} / شهرياً` : `${base} / month`;
}

export function gregorian(d: string | Date, l: Locale) {
  return new Intl.DateTimeFormat(l === "ar" ? "ar-QA-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

/** Hijri date (Umm al-Qura), NFR-I18-01. */
export function hijri(d: string | Date, l: Locale) {
  return new Intl.DateTimeFormat(
    l === "ar" ? "ar-SA-u-ca-islamic-umalqura-nu-latn" : "en-u-ca-islamic-umalqura",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(new Date(d));
}

export function timeAgo(d: string | Date, l: Locale) {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(l === "ar" ? "ar-u-nu-latn" : "en", { numeric: "auto" });
  if (Math.abs(mins) < 60) return rtf.format(-mins, "minute");
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return rtf.format(-hrs, "hour");
  return rtf.format(-Math.round(hrs / 24), "day");
}

export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
