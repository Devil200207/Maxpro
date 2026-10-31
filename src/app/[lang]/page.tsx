"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building,
  Building2,
  Car,
  Castle,
  Home as HomeIcon,
  Landmark,
  MessageCircle,
  Network,
  Users,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";
import { advertisers, propertyTypes, zones, type PropertyType, type Purpose } from "@/lib/data";
import { useStore } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { paramsFromQuery } from "@/lib/search";
import { ListingCard } from "@/components/ListingCard";
import { Badge, btn, Card, cn, ReqTag } from "@/components/ui";
import { StageBadge, StageGate } from "@/lib/stage";

const typeIcons: Record<PropertyType, typeof Building> = {
  apartment: Building,
  villa: Castle,
  townhouse: HomeIcon,
  penthouse: Building2,
  studio: Store,
  office: Landmark,
};

const zoneImages: Record<string, string> = {
  pearl: "/img/ext-8.jpg",
  lusail: "/img/ext-5.jpg",
  westbay: "/img/hero-tower.jpg",
  alwaab: "/img/ext-3.jpg",
  msheireb: "/img/ext-13.jpg",
  alwakrah: "/img/ext-14.jpg",
};

export default function Home() {
  const { t, p, href, lang } = useLang();
  const router = useRouter();
  const { state } = useStore();

  const [purpose, setPurpose] = useState<Purpose>("rent");
  const [zone, setZone] = useState("");
  const [type, setType] = useState("");
  const [beds, setBeds] = useState("");
  const [max, setMax] = useState("");
  const [q, setQ] = useState("");

  const live = useMemo(() => state.listings.filter((l) => l.status === "live"), [state.listings]);
  const featured = useMemo(() => {
    const rank = { premium: 2, featured: 1, none: 0 } as const;
    return live
      .filter((l) => l.promotion !== "none")
      .sort((a, b) => rank[b.promotion] - rank[a.promotion])
      .slice(0, 6);
  }, [live]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = paramsFromQuery({
      purpose,
      zone: zone || undefined,
      type: (type as PropertyType) || undefined,
      beds: beds === "" ? undefined : Number(beds),
      maxPrice: max ? Number(max) : undefined,
      q: q.trim() || undefined,
    });
    router.push(href(`/search?${sp.toString()}`));
  };

  const budgets =
    purpose === "rent" ? [5000, 8000, 10000, 15000, 20000, 30000, 50000] : [1000000, 2000000, 3000000, 5000000, 8000000, 12000000];

  const agencies = advertisers.filter((a) => a.verified && a.kind === "agency");
  const popularZones = zones.filter((z) => zoneImages[z.id]);

  const selectCls =
    "w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image src="/img/ext-8.jpg" alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/75 via-navy-950/55 to-navy-950/80" />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="max-w-2xl">
            <Badge tone="none" className="bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
              <Sparkles className="h-3 w-3 text-accent-400" />
              {t("WhatsApp-first · AI-assisted", "تواصل عبر واتساب · بمساعدة الذكاء الاصطناعي")}
            </Badge>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              {t("Find your next home in Qatar", "اعثر على منزلك القادم في قطر")}
            </h1>
            <p className="mt-3 text-lg text-stone-200">
              {t(
                "Verified listings from trusted agencies and owners — get the full property pack on WhatsApp in seconds.",
                "إعلانات موثقة من وكالات وملاك موثوقين — احصل على ملف العقار كاملاً على واتساب خلال ثوانٍ.",
              )}
            </p>
          </div>

          <form onSubmit={submit} className="mt-8 max-w-5xl rounded-2xl bg-white p-3 shadow-2xl sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              {(["rent", "sale"] as Purpose[]).map((pp) => (
                <button
                  key={pp}
                  type="button"
                  onClick={() => {
                    setPurpose(pp);
                    setMax("");
                  }}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold transition",
                    purpose === pp ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-stone-100",
                  )}
                >
                  {pp === "rent" ? t("Rent", "إيجار") : t("Buy", "شراء")}
                </button>
              ))}
              <ReqTag id="FR-WEB-02" className="ms-auto" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("Keyword, building or area (e.g. Porto Arabia, مسبح)", "كلمة، مبنى أو منطقة (مثال: بورتو أرابيا، pool)")}
                  className={cn(selectCls, "ps-9")}
                />
              </div>
              <select value={zone} onChange={(e) => setZone(e.target.value)} className={selectCls} aria-label={t("Area", "المنطقة")}>
                <option value="">{t("All areas", "كل المناطق")}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {p(z.name)}
                  </option>
                ))}
              </select>
              <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls} aria-label={t("Type", "النوع")}>
                <option value="">{t("All types", "كل الأنواع")}</option>
                {propertyTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {p(pt.name)}
                  </option>
                ))}
              </select>
              <select value={beds} onChange={(e) => setBeds(e.target.value)} className={selectCls} aria-label={t("Bedrooms", "غرف النوم")}>
                <option value="">{t("Any beds", "أي عدد غرف")}</option>
                <option value="0">{t("Studio", "استوديو")}</option>
                {[1, 2, 3, 4, 5].map((b) => (
                  <option key={b} value={b}>
                    {b}+ {t("beds", "غرف")}
                  </option>
                ))}
              </select>
              <select value={max} onChange={(e) => setMax(e.target.value)} className={selectCls} aria-label={t("Max budget", "الحد الأقصى للميزانية")}>
                <option value="">{t("Any budget", "أي ميزانية")}</option>
                {budgets.map((b) => (
                  <option key={b} value={b}>
                    {t("Up to", "حتى")} {new Intl.NumberFormat(lang === "ar" ? "ar-QA-u-nu-latn" : "en-US").format(b)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={cn(btn.primary, "mt-3 w-full py-3 text-base")}>
              <Search className="h-5 w-5" />
              {t("Search properties", "ابحث عن عقار")}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-stone-200">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent-400" />
              {t("Verified advertisers & permits", "معلنون وتراخيص موثقة")}
            </span>
            <span className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-wa-500" />
              {t("Official WhatsApp Business", "واتساب للأعمال الرسمي")}
            </span>
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-sky-300" />
              {t("AI assistant in Arabic & English", "مساعد ذكي بالعربية والإنجليزية")}
            </span>
          </div>
        </div>
      </section>

      {/* Browse by type */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <h2 className="text-xl font-bold text-stone-900">{t("Browse by property type", "تصفح حسب نوع العقار")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {propertyTypes.map((pt) => {
            const Icon = typeIcons[pt.id];
            const count = live.filter((l) => l.type === pt.id).length;
            return (
              <Link
                key={pt.id}
                href={href(`/search?type=${pt.id}`)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-stone-900">{p(pt.name)}</span>
                  <span className="text-xs text-stone-500">
                    {count} {t("listings", "إعلان")}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{t("Featured properties", "عقارات مميزة")}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {t("Premium and featured placements from verified advertisers", "إعلانات مميزة وبريميوم من معلنين موثقين")}
            </p>
          </div>
          <Link href={href("/search")} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            {t("View all", "عرض الكل")}
            <ArrowRight className="flip-rtl h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((l) => (
            <ListingCard key={l.id} l={l} />
          ))}
        </div>
      </section>

      {/* WhatsApp + AI strip — property packs and the AI assistant are Stage 2 */}
      <StageGate stage="S2" mode="hide">
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl bg-navy-900 text-white lg:grid-cols-2">
          <div className="p-8 sm:p-10">
            <Badge tone="none" className="bg-wa-500/20 text-wa-500">
              <MessageCircle className="h-3 w-3" />
              {t("WhatsApp-first", "واتساب أولاً")}
            </Badge>
            <StageBadge s="S2" className="ms-2" />
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
              {t("The whole property, delivered to your WhatsApp", "العقار كاملاً يصلك على واتساب")}
            </h2>
            <p className="mt-3 text-stone-300">
              {t(
                "Tap “Send to WhatsApp” on any listing and receive a property pack: summary, location pin and photos grouped by room — living room, bedrooms, bathrooms, kitchen, exterior and floor plan.",
                "اضغط “أرسل إلى واتساب” في أي إعلان واستلم ملف العقار: ملخص وموقع على الخريطة وصور مصنفة حسب الغرف — المعيشة والنوم والحمامات والمطبخ والواجهة والمخطط.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={href("/whatsapp?listing=AQ-10231&pack=1")} className={btn.wa}>
                <MessageCircle className="h-4 w-4" />
                {t("Try the WhatsApp demo", "جرّب عرض واتساب")}
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 p-8 sm:p-10 lg:border-s lg:border-t-0">
            <Badge tone="none" className="bg-sky-400/20 text-sky-300">
              <Bot className="h-3 w-3" />
              {t("AI assistant", "المساعد الذكي")}
            </Badge>
            <StageBadge s="S2" className="ms-2" />
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{t("Just describe what you need", "فقط صِف ما تحتاجه")}</h2>
            <p className="mt-3 text-stone-300">
              {t(
                "“2 bedroom furnished near the metro under 10k” — our assistant searches live listings only, cites every listing ID and hands you to a human whenever you want.",
                "“غرفتين مفروشة قرب المترو بأقل من 10 آلاف” — يبحث مساعدنا في الإعلانات المنشورة فقط ويذكر رقم كل إعلان ويحولك لموظف متى شئت.",
              )}
            </p>
            <ul className="mt-6 space-y-2 text-sm text-stone-300">
              {[
                t("Arabic & English, text or voice notes", "بالعربية والإنجليزية، نصاً أو رسائل صوتية"),
                t("Never invents properties or prices", "لا يخترع عقارات أو أسعاراً"),
                t("Human handover at any time", "تحويل لموظف في أي وقت"),
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-sky-300" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      </StageGate>

      {/* Popular zones */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <h2 className="text-xl font-bold text-stone-900">{t("Popular areas", "المناطق الأكثر طلباً")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {popularZones.map((z) => {
            const count = live.filter((l) => l.zoneId === z.id).length;
            return (
              <Link key={z.id} href={href(`/search?zone=${z.id}`)} className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
                <Image src={zoneImages[z.id]} alt={p(z.name)} fill sizes="(max-width: 768px) 50vw, 16vw" className="object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-0 start-0 p-3 text-white">
                  <div className="font-semibold">{p(z.name)}</div>
                  <div className="text-xs text-stone-200">
                    {count} {t("listings", "إعلان")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Advertiser spotlight */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <h2 className="text-xl font-bold text-stone-900">{t("Advertiser spotlight", "معلنون مميزون")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {agencies.map((a) => {
            const count = live.filter((l) => l.advertiserId === a.id).length;
            return (
              <Card key={a.id} className="flex items-center gap-4 p-5">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white" style={{ background: a.color }}>
                  {a.initials}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                    <span className="truncate">{p(a.name)}</span>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" />
                  </div>
                  <div className="text-xs text-stone-500">
                    {t("Licence", "رخصة")} {a.licence} · {count} {t("live listings", "إعلان منشور")}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Service verticals */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <h2 className="text-xl font-bold text-stone-900">{t("More from AqarPro", "المزيد من عقار برو")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Building, title: t("Property", "العقارات"), desc: t("Rent and buy across Qatar", "إيجار وشراء في جميع أنحاء قطر"), to: "/search" },
            { icon: Wrench, title: t("Services directory", "دليل الخدمات"), desc: t("Movers, cleaning, maintenance", "نقل وتنظيف وصيانة"), to: "/search" },
            { icon: Scale, title: t("Legal", "الخدمات القانونية"), desc: t("Tenancy contracts and advice", "عقود الإيجار والاستشارات") },
            { icon: Car, title: t("Auto repair", "صيانة السيارات"), desc: t("Trusted garages near you", "ورش موثوقة بالقرب منك") },
          ].map((v) => {
            const inner = (
              <Card className={cn("flex h-full items-start gap-4 p-5", v.to ? "transition hover:shadow-md" : "opacity-70")}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-700">
                  <v.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2 font-semibold text-stone-900">
                    {v.title}
                    {!v.to && <Badge>{t("Coming soon", "قريباً")}</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-stone-500">{v.desc}</p>
                </div>
              </Card>
            );
            return v.to ? (
              <Link key={v.title} href={href(v.to)}>
                {inner}
              </Link>
            ) : (
              <div key={v.title}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Advertiser CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-8 py-10 text-white sm:px-12">
          <div className="absolute -end-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 end-32 h-48 w-48 rounded-full bg-accent-400/20" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold sm:text-3xl">{t("Advertise with AqarPro", "أعلن مع عقار برو")}</h2>
              <p className="mt-2 text-brand-100">
                {t(
                  "Subscription plans for owners, brokers and agencies — with WhatsApp lead routing, analytics and managed Meta campaigns.",
                  "باقات اشتراك للملاك والوسطاء والوكالات — مع توجيه العملاء عبر واتساب والإحصاءات وحملات ميتا المُدارة.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={href("/pricing")} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                {t("See plans", "اطلع على الباقات")}
                <ArrowRight className="flip-rtl h-4 w-4" />
              </Link>
              <Link href={href("/advertiser/new")} className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                {t("Post a listing", "أضف إعلان")}
              </Link>
            </div>
          </div>
          <div className="relative mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Sparkles, to: "/advertiser/studio", title: t("AI Listing Studio", "استوديو الإعلانات الذكي"), text: t("Paste details or upload photos — get Arabic and English listings with quality checks.", "الصق التفاصيل أو ارفع الصور — واحصل على إعلان بالعربية والإنجليزية مع فحص الجودة.") },
              { icon: Network, to: "/hub", title: t("Portal Integration Hub", "مركز ربط البوابات"), text: t("Publish one listing to several property portals, with status and safe retries.", "انشر إعلاناً واحداً على عدة بوابات مع متابعة الحالة وإعادة المحاولة بأمان.") },
              { icon: Users, to: "/advertiser/leads", title: t("Lead manager", "إدارة العملاء"), text: t("Every enquiry in one place — assign, follow up and see what converts.", "كل الاستفسارات في مكان واحد — عيّن وتابع واعرف ما يتحول إلى صفقة.") },
            ].map((f) => (
              <Link key={f.to} href={href(f.to)} className="group rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:bg-white/15">
                <div className="flex items-center gap-2">
                  <f.icon className="h-5 w-5 text-accent-300" />
                  <span className="font-semibold">{f.title}</span>
                  <StageBadge s="S1" className="ms-auto" />
                </div>
                <p className="mt-1.5 text-sm text-brand-100">{f.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
