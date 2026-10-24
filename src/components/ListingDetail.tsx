"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Expand,
  Flag,
  Heart,
  Languages,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Ruler,
  Share2,
  Sofa,
  X,
} from "lucide-react";
import {
  advertiserById,
  amenityName,
  furnishingName,
  pois,
  roomCatName,
  typeName,
  zoneById,
  type Listing,
  type RoomCat,
} from "@/lib/data";
import { compactQar, gregorian, hijri, km, num, qar } from "@/lib/format";
import { similarListings } from "@/lib/search";
import { uid, useListing, useStore } from "@/lib/store";
import { track } from "@/lib/tracking";
import { useLang } from "@/lib/useLang";
import { ListingCard } from "./ListingCard";
import { toast } from "./Toaster";
import { Badge, btn, Card, cn, input, ReqTag } from "./ui";

const ListingMap = dynamic(() => import("./MapView").then((m) => m.ListingMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-stone-200" />,
});

type Tab = "all" | Exclude<RoomCat, "other">;
const TABS: Tab[] = ["all", "exterior", "living", "bedroom", "bathroom", "kitchen", "floorplan"];

const isSvg = (src: string) => src.endsWith(".svg");

export function ListingDetail({ id }: { id: string }) {
  const { t, href } = useLang();
  const { ready } = useStore();
  const l = useListing(id);

  useEffect(() => {
    if (l) track("ViewContent", { content_ids: [l.id], content_type: "home_listing", value: l.price, currency: "QAR" });
  }, [l?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!l) {
    if (!ready) return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-stone-500">…</div>;
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-stone-900">{t("Listing not found", "الإعلان غير موجود")}</h1>
        <p className="mt-2 text-stone-500">{t(`We couldn't find listing ${id}. It may have been removed.`, `لم نعثر على الإعلان ${id}. ربما تمت إزالته.`)}</p>
        <Link href={href("/search")} className={cn(btn.primary, "mt-6")}>
          {t("Browse properties", "تصفح العقارات")}
        </Link>
      </div>
    );
  }
  return <Detail l={l} />;
}

function Detail({ l }: { l: Listing }) {
  const { lang, t, p, href, isAr } = useLang();
  const { state, update, audit, toggleFavourite } = useStore();
  const adv = advertiserById(l.advertiserId);
  const zone = zoneById(l.zoneId);
  const fav = state.favourites.includes(l.id);

  const [tab, setTab] = useState<Tab>("all");
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [otherLang, setOtherLang] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  const photos = useMemo(() => (tab === "all" ? l.media : l.media.filter((m) => m.cat === tab)), [l.media, tab]);
  const current = photos[Math.min(idx, photos.length - 1)];
  const counts = (c: Tab) => (c === "all" ? l.media.length : l.media.filter((m) => m.cat === c).length);

  const len = photos.length;
  const go = (d: number) => setIdx((i) => (i + d + len) % len);

  useEffect(() => {
    if (!lightbox) return;
    const step = (d: number) => setIdx((i) => (i + d + len) % len);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") step(isAr ? -1 : 1);
      if (e.key === "ArrowLeft") step(isAr ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, len, isAr]);

  const nearest = useMemo(
    () =>
      pois
        .map((x) => ({ x, d: km(l, x) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3),
    [l],
  );
  const similar = useMemo(() => similarListings(state.listings, l, 3), [state.listings, l]);
  const otherCount = state.listings.filter((x) => x.advertiserId === adv.id && x.status === "live" && x.id !== l.id).length;

  const waClick = () => {
    update((s) => ({
      ...s,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, stats: { ...x.stats, waClicks: x.stats.waClicks + 1 } } : x)),
    }));
    track("Contact", { content_ids: [l.id], channel: "whatsapp" });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p(l.title), url });
      else {
        await navigator.clipboard.writeText(url);
        toast(t("Link copied", "تم نسخ الرابط"));
      }
    } catch {
      /* user cancelled */
    }
  };

  const facts = [
    { icon: BedDouble, label: t("Bedrooms", "غرف النوم"), value: l.beds === 0 ? t("Studio", "استوديو") : l.beds },
    { icon: Bath, label: t("Bathrooms", "الحمامات"), value: l.baths },
    { icon: Ruler, label: t("Size", "المساحة"), value: `${num(l.area, lang)} ${t("sqm", "م²")}` },
    { icon: Building2, label: t("Type", "النوع"), value: p(typeName(l.type)) },
    { icon: Sofa, label: t("Furnishing", "التأثيث"), value: p(furnishingName[l.furnishing]) },
    { icon: Car, label: t("Parking", "المواقف"), value: l.parking },
  ];

  const yes = t("Yes", "نعم");
  const no = t("No", "لا");
  const details: [string, React.ReactNode][] = [
    [t("Listing ID", "رقم الإعلان"), <span key="id" className="font-mono">{l.id}</span>],
    [t("Advertising permit", "ترخيص الإعلان"), l.permitNo ?? <span className="text-amber-700">{t("Pending", "قيد الإصدار")}</span>],
    [t("Purpose", "الغرض"), l.purpose === "rent" ? t("For rent", "للإيجار") : t("For sale", "للبيع")],
    [t("Furnishing", "التأثيث"), p(furnishingName[l.furnishing])],
    [t("Floor", "الطابق"), l.floor ?? "—"],
    [t("View", "الإطلالة"), l.view ? p(l.view) : "—"],
    [t("Building / compound", "المبنى / الكمباوند"), l.building ? p(l.building) : "—"],
    [t("Maid's room", "غرفة خادمة"), l.maidRoom ? yes : no],
    [t("Balcony", "شرفة"), l.balcony ? yes : no],
    [t("Pets allowed", "يسمح بالحيوانات"), l.pets ? yes : no],
    [
      t("Suitable for", "مناسب لـ"),
      l.suitability === "family" ? t("Families", "العائلات") : l.suitability === "bachelor" ? t("Bachelors / professionals", "العزاب / المهنيين") : t("Anyone", "الجميع"),
    ],
    [t("Source", "المصدر"), l.source.toUpperCase()],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:pb-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
        <Link href={href("/")} className="hover:text-brand-600">
          {t("Home", "الرئيسية")}
        </Link>
        <ChevronRight className="flip-rtl h-3 w-3" />
        <Link href={href(`/search?purpose=${l.purpose}`)} className="hover:text-brand-600">
          {l.purpose === "rent" ? t("Rent", "إيجار") : t("Buy", "شراء")}
        </Link>
        <ChevronRight className="flip-rtl h-3 w-3" />
        <Link href={href(`/search?purpose=${l.purpose}&zone=${l.zoneId}`)} className="hover:text-brand-600">
          {p(zone.name)}
        </Link>
        <ChevronRight className="flip-rtl h-3 w-3" />
        <span className="font-mono text-stone-700">{l.id}</span>
      </nav>

      {l.status !== "live" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t(`This listing is ${l.status} and not visible in public search.`, `هذا الإعلان بحالة "${l.status}" وغير ظاهر في البحث العام.`)}
        </div>
      )}

      {/* Gallery */}
      <section>
        <div className="mb-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {TABS.filter((c) => counts(c) > 0).map((c) => (
            <button
              key={c}
              onClick={() => {
                setTab(c);
                setIdx(0);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                tab === c ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-400",
              )}
            >
              {c === "all" ? t("All photos", "كل الصور") : p(roomCatName[c])} <span className="opacity-60">({counts(c)})</span>
            </button>
          ))}
          <ReqTag id="FR-LST-03" className="shrink-0" />
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <button onClick={() => setLightbox(true)} className="group relative aspect-[16/10] overflow-hidden rounded-2xl bg-stone-100">
            <Image
              key={current.src + idx}
              src={current.src}
              alt={`${p(roomCatName[current.cat])} — ${p(l.title)}`}
              fill
              priority
              unoptimized={isSvg(current.src)}
              sizes="(max-width: 1024px) 100vw, 75vw"
              className={cn(isSvg(current.src) ? "object-contain bg-white p-4" : "object-cover")}
            />
            <span className="absolute start-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">{p(roomCatName[current.cat])}</span>
            <span className="absolute bottom-3 end-3 flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-stone-800 opacity-90 group-hover:opacity-100">
              <Expand className="h-3.5 w-3.5" />
              {idx + 1} / {photos.length}
            </span>
            {photos.length > 1 && (
              <>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="absolute start-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white"
                >
                  <ChevronLeft className="flip-rtl h-5 w-5" />
                </span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="absolute end-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow hover:bg-white"
                >
                  <ChevronRight className="flip-rtl h-5 w-5" />
                </span>
              </>
            )}
          </button>
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-2 lg:content-start">
            {photos.slice(0, 8).map((m, i) => (
              <button
                key={m.src + i}
                onClick={() => setIdx(i)}
                className={cn("relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100 ring-2 transition", i === idx ? "ring-brand-600" : "ring-transparent hover:ring-stone-300")}
              >
                <Image src={m.src} alt="" fill unoptimized={isSvg(m.src)} sizes="150px" className={isSvg(m.src) ? "object-contain bg-white" : "object-cover"} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          {/* Title block */}
          <section>
            <div className="flex flex-wrap items-center gap-2">
              {l.promotion === "premium" && <Badge tone="gold">{t("Premium", "بريميوم")}</Badge>}
              {l.promotion === "featured" && <Badge tone="brand">{t("Featured", "مميز")}</Badge>}
              <Badge>{l.purpose === "rent" ? t("For rent", "للإيجار") : t("For sale", "للبيع")}</Badge>
              {adv.verified && (
                <Badge tone="blue">
                  <BadgeCheck className="h-3 w-3" />
                  {t("Verified advertiser", "معلن موثق")}
                </Badge>
              )}
              {l.permitNo && <Badge tone="green">{t("Permit", "ترخيص")} {l.permitNo}</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-3xl font-extrabold tracking-tight text-stone-900">
                  {qar(l.price, lang)}
                  {l.purpose === "rent" && <span className="text-base font-semibold text-stone-500"> {t("/ month", "/ شهرياً")}</span>}
                </div>
                <h1 className="mt-1 text-xl font-semibold text-stone-800">{p(l.title)}</h1>
                <div className="mt-1.5 flex items-center gap-1 text-sm text-stone-500">
                  <MapPin className="h-4 w-4" />
                  {l.building ? `${p(l.building)}, ` : ""}
                  {p(zone.name)}, {t("Doha, Qatar", "الدوحة، قطر")}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleFavourite(l.id)} className={btn.secondary} aria-label={t("Save", "حفظ")}>
                  <Heart className={cn("h-4 w-4", fav && "fill-brand-600 text-brand-600")} />
                  <span className="hidden sm:inline">{fav ? t("Saved", "محفوظ") : t("Save", "حفظ")}</span>
                </button>
                <button onClick={share} className={btn.secondary} aria-label={t("Share", "مشاركة")}>
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("Share", "مشاركة")}</span>
                </button>
                <button onClick={() => setReportOpen(true)} className={btn.secondary} aria-label={t("Report", "إبلاغ")}>
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Key facts */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-xs text-stone-500">{f.label}</div>
                  <div className="text-sm font-semibold text-stone-900">{f.value}</div>
                </div>
              </div>
            ))}
          </section>

          {/* Price details */}
          <Card className="p-5">
            <h2 className="text-base font-bold text-stone-900">{t("Price details", "تفاصيل السعر")}</h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row k={l.purpose === "rent" ? t("Monthly rent", "الإيجار الشهري") : t("Sale price", "سعر البيع")} v={qar(l.price, lang)} />
              {l.purpose === "rent" && <Row k={t("Annual rent", "الإيجار السنوي")} v={compactQar(l.price * 12, lang)} />}
              {l.purpose === "sale" && <Row k={t("Price per sqm", "السعر للمتر")} v={qar(Math.round(l.price / l.area), lang)} />}
              {l.cheques && <Row k={t("Payment", "الدفع")} v={t(`${l.cheques} cheques`, `${l.cheques} شيكات`)} />}
              {l.deposit && <Row k={t("Security deposit", "التأمين")} v={qar(l.deposit, lang)} />}
              <Row k={t("Commission", "العمولة")} v={l.commission ?? t("None — owner direct", "لا يوجد — من المالك")} />
              <Row k={t("Utilities", "الخدمات")} v={l.utilitiesIncluded ? t("Included", "مشمولة") : t("Not included", "غير مشمولة")} />
              <Row k={t("Negotiable", "قابل للتفاوض")} v={l.negotiable ? yes : no} />
            </dl>
          </Card>

          {/* Description */}
          <section>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-stone-900">{t("Description", "الوصف")}</h2>
              <button onClick={() => setOtherLang((v) => !v)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700">
                <Languages className="h-3.5 w-3.5" />
                {otherLang ? t("Hide Arabic", "إخفاء الإنجليزية") : t("Show in Arabic", "عرض بالإنجليزية")}
              </button>
            </div>
            <p className="mt-2 leading-relaxed text-stone-700">{p(l.description)}</p>
            {otherLang && (
              <p dir={isAr ? "ltr" : "rtl"} className="mt-3 rounded-xl bg-stone-100 p-4 leading-relaxed text-stone-700">
                {isAr ? l.description.en : l.description.ar}
              </p>
            )}
          </section>

          {/* Amenities */}
          <section>
            <h2 className="text-lg font-bold text-stone-900">{t("Amenities", "المرافق")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {l.amenities.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  {p(amenityName(a))}
                </span>
              ))}
            </div>
          </section>

          {/* Details table */}
          <section>
            <h2 className="text-lg font-bold text-stone-900">{t("Property details", "تفاصيل العقار")}</h2>
            <dl className="mt-3 grid grid-cols-1 overflow-hidden rounded-xl border border-stone-200 bg-white text-sm sm:grid-cols-2">
              {details.map(([k, v], i) => (
                <div key={k} className={cn("flex justify-between gap-4 px-4 py-2.5", i % 4 < 2 ? "bg-stone-50" : "")}>
                  <dt className="text-stone-500">{k}</dt>
                  <dd className="text-end font-medium text-stone-900">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {t("Listed", "تاريخ النشر")}: {gregorian(l.createdAt, lang)} · <span dir={isAr ? "rtl" : "ltr"}>{hijri(l.createdAt, lang)}</span>
              </span>
              <span>
                {t("Expires", "ينتهي")}: {gregorian(l.expiresAt, lang)}
              </span>
            </div>
          </section>

          {/* Location */}
          <section>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">{t("Location & nearby", "الموقع وما حوله")}</h2>
              <ReqTag id="FR-WEB-04" />
            </div>
            <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200">
              <ListingMap listing={l} nearby={nearest.map((n) => n.x)} className="h-72 w-full" />
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {nearest.map(({ x, d }) => (
                <li key={x.name.en} className="rounded-xl border border-stone-200 bg-white px-3 py-2.5">
                  <div className="text-sm font-semibold text-stone-900">{p(x.name)}</div>
                  <div className="text-xs text-stone-500">
                    {kindLabel(x.kind, t)} · {d.toFixed(1)} {t("km", "كم")}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Advertiser */}
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white" style={{ background: adv.color }}>
              {adv.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                {p(adv.name)}
                {adv.verified && <BadgeCheck className="h-4 w-4 text-sky-600" />}
              </div>
              <div className="text-xs text-stone-500">
                {adv.kind === "agency" ? t("Real-estate agency", "وكالة عقارية") : t("Individual advertiser", "معلن فرد")}
                {adv.licence && ` · ${t("Licence", "رخصة")} ${adv.licence}`} · {t("Member since", "عضو منذ")} {gregorian(adv.memberSince, lang)}
              </div>
            </div>
            <Link href={href(`/search?q=${encodeURIComponent(adv.name.en.split(" ")[0])}`)} className={btn.secondary}>
              {t(`${otherCount} more listings`, `${otherCount} إعلانات أخرى`)}
            </Link>
          </Card>
        </div>

        {/* Contact box */}
        <aside>
          <div className="space-y-4 lg:sticky lg:top-20">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900">{t("Contact the advertiser", "تواصل مع المعلن")}</span>
                <ReqTag id="FR-WAP-02" />
              </div>
              <div className="mt-4 space-y-2">
                <Link href={href(`/whatsapp?listing=${l.id}`)} onClick={waClick} className={cn(btn.wa, "w-full py-3")}>
                  <MessageCircle className="h-4 w-4" />
                  {t("Chat on WhatsApp", "تحدث عبر واتساب")}
                </Link>
                <Link
                  href={href(`/whatsapp?listing=${l.id}&pack=1`)}
                  onClick={waClick}
                  className={cn(btn.secondary, "w-full border-wa-500/50 text-wa-700 hover:bg-wa-500/5")}
                >
                  <Package className="h-4 w-4" />
                  {t("Send property pack to my WhatsApp", "أرسل ملف العقار إلى واتساب")}
                </Link>
                <button
                  onClick={() => {
                    setShowPhone(true);
                    track("Contact", { content_ids: [l.id], channel: "phone" });
                  }}
                  className={cn(btn.secondary, "w-full")}
                >
                  <Phone className="h-4 w-4" />
                  <span dir="ltr">{showPhone ? adv.phone : `${adv.phone.slice(0, 8)} •• ••`}</span>
                </button>
              </div>
            </Card>
            <EnquiryForm l={l} />
          </div>
        </aside>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-stone-900">{t("Similar properties", "عقارات مشابهة")}</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <ListingCard key={s.id} l={s} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-stone-200 bg-white p-3 lg:hidden">
        <Link href={href(`/whatsapp?listing=${l.id}`)} onClick={waClick} className={cn(btn.wa, "flex-1")}>
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Link>
        <a href="#enquiry" className={cn(btn.primary, "flex-1")}>
          {t("Enquire", "استفسر")}
        </a>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/95">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm">
              {p(roomCatName[current.cat])} · {idx + 1} / {photos.length}
            </span>
            <button onClick={() => setLightbox(false)} className="rounded-full p-2 hover:bg-white/10" aria-label={t("Close", "إغلاق")}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={current.src} alt="" fill unoptimized={isSvg(current.src)} sizes="100vw" className={cn("object-contain", isSvg(current.src) && "bg-white")} />
            <button onClick={() => go(-1)} className="absolute start-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label={t("Previous", "السابق")}>
              <ArrowLeft className="flip-rtl h-6 w-6" />
            </button>
            <button onClick={() => go(1)} className="absolute end-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label={t("Next", "التالي")}>
              <ArrowRight className="flip-rtl h-6 w-6" />
            </button>
          </div>
          <div className="flex justify-center gap-2 overflow-x-auto p-4 scrollbar-none">
            {photos.map((m, i) => (
              <button key={m.src + i} onClick={() => setIdx(i)} className={cn("relative h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2", i === idx ? "ring-white" : "ring-transparent opacity-60")}>
                <Image src={m.src} alt="" fill unoptimized={isSvg(m.src)} sizes="80px" className={isSvg(m.src) ? "object-contain bg-white" : "object-cover"} />
              </button>
            ))}
          </div>
        </div>
      )}

      {reportOpen && (
        <ReportModal
          onClose={() => setReportOpen(false)}
          onSubmit={(reason, note) => {
            audit({ actor: "Visitor report", role: "system", action: "listing.reported", target: l.id, detail: `${reason}${note ? `: ${note}` : ""}` });
            setReportOpen(false);
            toast(t("Thanks — our moderators will review this listing", "شكراً — سيراجع المشرفون هذا الإعلان"));
          }}
        />
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-stone-200 py-1.5">
      <dt className="text-stone-500">{k}</dt>
      <dd className="font-semibold text-stone-900">{v}</dd>
    </div>
  );
}

function kindLabel(kind: string, t: (en: string, ar: string) => string) {
  switch (kind) {
    case "mall":
      return t("Shopping", "تسوق");
    case "metro":
      return t("Metro station", "محطة مترو");
    case "hospital":
      return t("Hospital", "مستشفى");
    case "school":
      return t("School", "مدرسة");
    default:
      return t("Beach", "شاطئ");
  }
}

function EnquiryForm({ l }: { l: Listing }) {
  const { lang, t } = useLang();
  const { update } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(true);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const text = msg.trim() || t(`I'm interested in ${l.id}. Is it still available?`, `أنا مهتم بالإعلان ${l.id}. هل ما زال متاحاً؟`);
    update((s) => ({
      ...s,
      leads: [
        {
          id: uid("L"),
          listingId: l.id,
          advertiserId: l.advertiserId,
          name,
          phone,
          channel: "web",
          message: text,
          createdAt: now.toISOString(),
          status: "new",
          score: 55 + Math.min(30, text.length / 4),
          source: "Enquiry form",
        },
        ...s.leads,
      ],
      conversations: [
        {
          id: uid("C"),
          channel: "web",
          customer: { name, phone, lang },
          listingId: l.id,
          status: "open",
          tags: [],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          slaDueAt: new Date(now.getTime() + 30 * 60000).toISOString(),
          source: "Enquiry form",
          messages: [{ id: uid("m"), from: "user", text, at: now.toISOString() }],
        },
        ...s.conversations,
      ],
      consents: consent
        ? [{ id: uid("CS"), subject: phone, channel: "whatsapp", optedIn: true, at: now.toISOString(), via: `Enquiry form (${l.id})` }, ...s.consents]
        : s.consents,
      listings: s.listings.map((x) => (x.id === l.id ? { ...x, stats: { ...x.stats, enquiries: x.stats.enquiries + 1 } } : x)),
      notifications: [
        { id: uid("N"), at: now.toISOString(), channel: "email", to: "advertiser", template: "new_lead_routed", status: "sent" },
        ...s.notifications,
      ],
    }));
    track("Lead", { content_ids: [l.id], channel: "web_form" });
    toast(t("Enquiry sent — the advertiser has been notified", "تم إرسال الاستفسار — تم إبلاغ المعلن"));
    setSent(true);
  };

  return (
    <Card className="p-5" >
      <div id="enquiry" className="scroll-mt-24" />
      <h3 className="text-sm font-semibold text-stone-900">{t("Send an enquiry", "أرسل استفساراً")}</h3>
      {sent ? (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4" />
            {t("Enquiry received", "تم استلام الاستفسار")}
          </div>
          <p className="mt-1">
            {t("You'll hear back by WhatsApp or phone. You can track it in the support inbox demo.", "سيتم التواصل معك عبر واتساب أو الهاتف. يمكنك متابعته في صندوق الدعم.")}
          </p>
          <button onClick={() => setSent(false)} className="mt-2 text-xs font-semibold underline">
            {t("Send another", "أرسل استفساراً آخر")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-2.5">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Full name", "الاسم الكامل")} className={input} />
          <input
            required
            dir="ltr"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+974 5xxx xxxx"
            className={cn(input, "text-start")}
          />
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={3}
            placeholder={t(`I'm interested in ${l.id}. Is it still available?`, `أنا مهتم بالإعلان ${l.id}. هل ما زال متاحاً؟`)}
            className={input}
          />
          <label className="flex items-start gap-2 text-xs text-stone-600">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              {t(
                "I agree to be contacted on WhatsApp about this property. I can reply STOP at any time.",
                "أوافق على التواصل معي عبر واتساب بخصوص هذا العقار، ويمكنني إرسال STOP في أي وقت.",
              )}
            </span>
          </label>
          <button type="submit" className={cn(btn.primary, "w-full")}>
            {t("Send enquiry", "إرسال الاستفسار")}
          </button>
          <div className="flex justify-end">
            <ReqTag id="FR-ACC-04" />
          </div>
        </form>
      )}
    </Card>
  );
}

function ReportModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string, note: string) => void }) {
  const { t } = useLang();
  const reasons = [
    ["not_available", t("Property no longer available", "العقار لم يعد متاحاً")],
    ["wrong_price", t("Wrong price or details", "سعر أو تفاصيل خاطئة")],
    ["fake_photos", t("Photos don't match the property", "الصور لا تطابق العقار")],
    ["duplicate", t("Duplicate listing", "إعلان مكرر")],
    ["fraud", t("Suspected scam", "اشتباه احتيال")],
    ["discrimination", t("Discriminatory content", "محتوى تمييزي")],
  ];
  const [reason, setReason] = useState(reasons[0][0]);
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
            <Flag className="h-5 w-5 text-red-600" />
            {t("Report this listing", "الإبلاغ عن الإعلان")}
          </h2>
          <ReqTag id="FR-LST-09" />
        </div>
        <div className="space-y-2">
          {reasons.map(([id, label]) => (
            <label key={id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm", reason === id ? "border-brand-600 bg-brand-50" : "border-stone-200")}>
              <input type="radio" name="reason" checked={reason === id} onChange={() => setReason(id)} className="accent-brand-600" />
              {label}
            </label>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("Details (optional)", "تفاصيل (اختياري)")} className={cn(input, "mt-3")} />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className={btn.secondary}>
            {t("Cancel", "إلغاء")}
          </button>
          <button onClick={() => onSubmit(reason, note.trim())} className={btn.danger}>
            {t("Submit report", "إرسال البلاغ")}
          </button>
        </div>
      </div>
    </div>
  );
}
