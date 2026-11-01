"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  FileText,
  Inbox,
  Megaphone,
  Mic,
  Network,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Card, btn, cn } from "@/components/ui";
import { portals } from "@/lib/portals";
import { StageBadge, type Stage } from "@/lib/stage";
import { useLang } from "@/lib/useLang";

/**
 * AqarPro landing page. AqarPro does not list properties itself: it sits between
 * builders/agencies and the property portals, and provides the listing, publishing,
 * help-desk and marketing services around them.
 */
export default function Home() {
  const { t, p, href } = useLang();

  const services: { icon: typeof Bot; stage: Stage; title: string; desc: string; points: string[]; to: string }[] = [
    {
      icon: Sparkles,
      stage: "S1",
      title: t("Listing services", "خدمات الإعلانات"),
      desc: t("Send us a note, a document, a voice message or photos — AI prepares a complete Arabic and English listing, and your team approves it.", "أرسل ملاحظة أو مستنداً أو رسالة صوتية أو صوراً — يجهز الذكاء الاصطناعي إعلاناً كاملاً بالعربية والإنجليزية ويعتمده فريقك."),
      points: [t("Facts extracted, never invented", "استخراج المعلومات دون اختلاق"), t("Photos tagged by room", "تصنيف الصور حسب الغرف"), t("Quality and compliance checks", "فحوصات الجودة والامتثال")],
      to: "/advertiser/studio",
    },
    {
      icon: Network,
      stage: "S1",
      title: t("Portal connectors", "ربط البوابات"),
      desc: t("One master record, published to every property portal you choose through official connectors — with status, retries and no duplicates.", "سجل رئيسي واحد يُنشر على كل بوابة عقارية تختارها عبر روابط رسمية — مع متابعة الحالة وإعادة المحاولة دون تكرار."),
      points: [t("Portal-specific versions", "نسخة مخصصة لكل بوابة"), t("Missing fields flagged before publishing", "تنبيه للحقول الناقصة قبل النشر"), t("Live status dashboard", "لوحة حالة مباشرة")],
      to: "/hub",
    },
    {
      icon: Bot,
      stage: "S2",
      title: t("Help desk AI", "مساعد الدعم الذكي"),
      desc: t("Answers buyers and tenants on WhatsApp and web chat in Arabic and English, using only your live listings, and hands over to your team at any time.", "يرد على المشترين والمستأجرين عبر واتساب والمحادثة بالعربية والإنجليزية من إعلاناتك المنشورة فقط، ويحوّل لفريقك في أي وقت."),
      points: [t("Property packs on WhatsApp", "ملفات العقار على واتساب"), t("Scored leads with consent", "عملاء مقيّمون بموافقتهم"), t("Human handover with SLA", "تحويل لموظف مع مهلة خدمة")],
      to: "/whatsapp",
    },
    {
      icon: Megaphone,
      stage: "S2",
      title: t("Marketing AI", "التسويق الذكي"),
      desc: t("Drafts Facebook and Instagram campaigns for a property — audience, budget and bilingual copy — and launches only after you approve.", "يجهز حملات فيسبوك وإنستغرام للعقار — الجمهور والميزانية والنص بلغتين — ولا يطلقها إلا بعد موافقتك."),
      points: [t("Housing-ad policy checks", "فحص سياسات إعلانات الإسكان"), t("Spend caps you control", "سقف إنفاق تتحكم به"), t("Ad spend and fee billed separately", "فوترة الإعلان والرسوم بشكل منفصل")],
      to: "/advertiser/promote/AQ-10233",
    },
  ];

  const steps = [
    { icon: FileText, title: t("Send the property", "أرسل العقار"), desc: t("Text, listing sheet, voice note or photos — from the builder or the agent.", "نص أو ورقة بيانات أو رسالة صوتية أو صور — من المطور أو الوكيل.") },
    { icon: Sparkles, title: t("AI prepares it", "الذكاء الاصطناعي يجهزه"), desc: t("Bilingual descriptions, room-tagged photos and checks; your team confirms every fact.", "أوصاف بلغتين وصور مصنفة وفحوصات؛ يؤكد فريقك كل معلومة.") },
    { icon: Network, title: t("We publish everywhere", "ننشره في كل مكان"), desc: t("Each portal gets its own version through its official connector.", "كل بوابة تحصل على نسختها عبر رابطها الرسمي.") },
    { icon: Inbox, title: t("Enquiries come back", "الاستفسارات تعود إليك"), desc: t("Every lead from portals, WhatsApp and ads lands in one lead manager.", "كل العملاء من البوابات وواتساب والإعلانات في مدير عملاء واحد.") },
  ];

  const audience = [
    { icon: Building2, title: t("Builders & developers", "المطورون العقاريون"), desc: t("Launch a whole project on every portal at once.", "أطلق مشروعاً كاملاً على كل البوابات دفعة واحدة.") },
    { icon: Users, title: t("Agencies", "الوكالات"), desc: t("Team roles, shared inventory and one inbox for all leads.", "أدوار للفريق ومخزون مشترك وصندوق واحد لكل العملاء.") },
    { icon: UserRound, title: t("Brokers & owners", "الوسطاء والملاك"), desc: t("Professional listings and replies without the busywork.", "إعلانات احترافية وردود سريعة دون عناء.") },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-navy-950 text-white">
        <Image src="/img/hero-tower.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy-950 via-navy-950/90 to-brand-900/70" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent-300 ring-1 ring-white/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("For builders, agencies and brokers in Qatar", "للمطورين والوكالات والوسطاء في قطر")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {t("One property record.", "سجل عقاري واحد.")}
              <br />
              <span className="text-accent-400">{t("Every portal.", "كل البوابات.")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              {t(
                "AqarPro sits between you and the property portals. AI prepares your listings, our connectors publish them everywhere, and AI handles the enquiries and the marketing.",
                "عقار برو حلقة الوصل بينك وبين بوابات العقارات. يجهز الذكاء الاصطناعي إعلاناتك، وتنشرها روابطنا في كل مكان، ويتولى الذكاء الاصطناعي الاستفسارات والتسويق.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={href("/register")} className={cn(btn.primary, "px-6 py-3 text-base")}>
                {t("Get started", "ابدأ الآن")}
                <ArrowRight className="flip-rtl h-4 w-4" />
              </Link>
              <Link href={href("/advertiser")} className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">
                {t("Open the agency workspace", "افتح مساحة الوكالة")}
              </Link>
            </div>
          </div>

          {/* Flow visual: builder → AqarPro → portals */}
          <div className="rounded-3xl border border-white/15 bg-white/5 p-6 backdrop-blur">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1.2fr_auto_1fr] sm:items-center">
              <div className="rounded-2xl bg-white/10 p-4 text-center">
                <Building2 className="mx-auto h-7 w-7 text-accent-300" />
                <div className="mt-2 text-sm font-semibold">{t("Builder / agency", "المطور / الوكالة")}</div>
                <div className="mt-2 flex justify-center gap-2 text-white/60">
                  <FileText className="h-4 w-4" />
                  <Mic className="h-4 w-4" />
                </div>
              </div>
              <ArrowRight className="flip-rtl mx-auto hidden h-5 w-5 text-white/40 sm:block" />
              <div className="rounded-2xl bg-brand-600 p-4 text-center shadow-lg shadow-brand-900/40">
                <div className="text-lg font-extrabold">AqarPro</div>
                <div className="mt-2 space-y-1 text-[11px] text-white/85">
                  <div>{t("Listing services", "خدمات الإعلانات")}</div>
                  <div>{t("Portal connectors", "ربط البوابات")}</div>
                  <div>{t("Help desk AI · Marketing AI", "الدعم الذكي · التسويق الذكي")}</div>
                </div>
              </div>
              <ArrowRight className="flip-rtl mx-auto hidden h-5 w-5 text-white/40 sm:block" />
              <div className="space-y-2">
                {portals.map((pt) => (
                  <div key={pt.id} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-md text-xs font-bold text-white" style={{ background: pt.color }}>
                      {pt.short}
                    </span>
                    {p(pt.name)}
                  </div>
                ))}
                <div className="rounded-xl border border-dashed border-white/25 px-3 py-2 text-xs text-white/60">{t("+ more portals", "+ بوابات أخرى")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t("What your plan includes", "ما تتضمنه باقتك")}</h2>
          <p className="mt-2 text-stone-500">{t("Choose a plan, and we run these services for your properties.", "اختر باقة، ونحن ندير هذه الخدمات لعقاراتك.")}</p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {services.map((s) => (
            <Card key={s.title} className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <s.icon className="h-5 w-5" />
                </span>
                <StageBadge s={s.stage} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-stone-900">{s.title}</h3>
              <p className="mt-2 text-sm text-stone-600">{s.desc}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
                {s.points.map((x) => (
                  <li key={x} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                    {x}
                  </li>
                ))}
              </ul>
              <Link href={href(s.to)} className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand-600 hover:text-brand-700">
                {t("See it in the workspace", "شاهدها في مساحة العمل")}
                <ArrowRight className="flip-rtl h-4 w-4" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t("How it works", "كيف يعمل")}</h2>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-stone-200 p-5">
                <span className="absolute end-4 top-4 text-3xl font-extrabold text-stone-100">{i + 1}</span>
                <s.icon className="h-6 w-6 text-brand-600" />
                <h3 className="mt-3 font-semibold text-stone-900">{s.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-stone-900">{t("Connected portals", "البوابات المرتبطة")}</h2>
            <p className="mt-2 text-stone-600">
              {t(
                "We publish only through official APIs, approved feeds or methods each portal permits — never scraping. Each portal's capabilities are respected: if a portal can't unpublish or return leads, the workspace says so.",
                "ننشر فقط عبر الواجهات الرسمية أو التغذيات المعتمدة أو الطرق التي تسمح بها كل بوابة — دون أي استخلاص. ونحترم قدرات كل بوابة: إن لم تدعم إلغاء النشر أو إرجاع العملاء، توضح مساحة العمل ذلك.",
              )}
            </p>
            <Link href={href("/hub")} className={cn(btn.secondary, "mt-6")}>
              <Network className="h-4 w-4" />
              {t("Open the Portal Hub", "افتح مركز البوابات")}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {portals.map((pt) => (
              <Card key={pt.id} className="p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: pt.color }}>
                    {pt.short}
                  </span>
                  <span className="font-semibold text-stone-900">{p(pt.name)}</span>
                </div>
                <p className="mt-2 text-xs text-stone-500">{p(pt.note)}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {pt.capabilities.map((c) => (
                    <span key={c} className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] text-stone-600">
                      {c}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Audience + CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {audience.map((a) => (
            <div key={a.title} className="flex gap-3 rounded-2xl bg-white p-5 ring-1 ring-stone-200">
              <a.icon className="h-6 w-6 shrink-0 text-brand-600" />
              <div>
                <div className="font-semibold text-stone-900">{a.title}</div>
                <div className="mt-0.5 text-sm text-stone-600">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-3xl bg-gradient-to-br from-brand-700 to-navy-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">{t("Plans built around services", "باقات مبنية على الخدمات")}</h2>
            <p className="mt-2 text-white/75">{t("Pick the listing volume, portal connections, team seats and AI credits you need.", "اختر عدد الإعلانات وربط البوابات ومقاعد الفريق وأرصدة الذكاء الاصطناعي التي تحتاجها.")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={href("/pricing")} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-brand-50">
              {t("See plans", "عرض الباقات")}
            </Link>
            <Link href={href("/register")} className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
              {t("Get started", "ابدأ الآن")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
