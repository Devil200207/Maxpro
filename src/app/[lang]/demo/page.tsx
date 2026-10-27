import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bot, Building2, CheckCircle2, CircleDashed, CreditCard, Megaphone, MessageCircle, ShieldCheck } from "lucide-react";
import { Card, ReqTag } from "@/components/ui";
import { isLocale, tr, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Demo guide" };

export default async function DemoPage({ params }: PageProps<"/[lang]/demo">) {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = (en: string, ar: string) => tr(lang, en, ar);
  const h = (p: string) => `/${lang}${p}`;

  const scenarios = [
    {
      icon: Bot,
      title: t("1 · Find a property with the AI assistant", "1 · ابحث عن عقار بالمساعد الذكي"),
      reqs: ["WP-SUP-01", "WP-SUP-02", "WP-SUP-03", "WP-SUP-05", "WP-SUP-06"],
      steps: [
        t("Open the home page and click “Ask MaxPro AI” (bottom corner).", "افتح الصفحة الرئيسية واضغط «اسأل مساعد ماكس برو»."),
        t("Type “2 bed in The Pearl under 13k, furnished” — or in Arabic “شقة غرفتين في اللؤلؤة”.", "اكتب «شقة غرفتين في اللؤلؤة أقل من 13 ألف مفروشة»."),
        t("Every recommendation cites a real listing ID with a reason; nothing is invented.", "كل توصية تذكر رقم إعلان حقيقي مع السبب؛ لا شيء مختلق."),
        t("Click “Have the agent contact me” → lead with consent; or “Talk to a person” → handover.", "اضغط «تواصل الوكيل معي» لإنشاء عميل بموافقة، أو «تحدث مع شخص» للتحويل."),
      ],
      cta: { label: t("Start on home page", "ابدأ من الرئيسية"), to: "/" },
    },
    {
      icon: MessageCircle,
      title: t("2 · Receive a property pack on WhatsApp", "2 · استلم ملف العقار على واتساب"),
      reqs: ["FR-WAP-02", "FR-WAP-03", "FR-WAP-04", "FR-WAP-06"],
      steps: [
        t("Open any listing and press “Send property pack to my WhatsApp”.", "افتح أي إعلان واضغط «أرسل ملف العقار إلى واتساب»."),
        t("Accept the opt-in — consent is logged with a timestamp.", "وافق على الاشتراك — تُسجل الموافقة بالتاريخ والوقت."),
        t("Watch the summary, location pin and room-by-room photos arrive with captions.", "شاهد الملخص والموقع والصور حسب الغرف مع التعليقات."),
        t("Try the reply buttons, then type STOP to see opt-out handling.", "جرّب أزرار الرد ثم اكتب STOP لرؤية إلغاء الاشتراك."),
      ],
      cta: { label: t("Open a listing", "افتح إعلاناً"), to: "/listing/MP-10231" },
    },
    {
      icon: CreditCard,
      title: t("3 · Advertiser subscribes, pays and posts a listing", "3 · المعلن يشترك ويدفع وينشر إعلاناً"),
      reqs: ["FR-BIL-01", "FR-BIL-02", "FR-BIL-03", "FR-LST-01", "FR-LST-03", "FR-LST-05"],
      steps: [
        t("Pricing → choose a plan → pay by card with 3-D Secure (any 6 digits).", "الأسعار ← اختر باقة ← ادفع بالبطاقة مع التحقق (أي 6 أرقام)."),
        t("A sequential bilingual invoice is issued.", "تصدر فاتورة ثنائية اللغة بترقيم تسلسلي."),
        t("Post a listing: guided steps, photos by room, Arabic/English text, auto-checks.", "أضف إعلاناً: خطوات موجهة وصور حسب الغرف ونص عربي/إنجليزي وفحوصات تلقائية."),
        t("Open Admin in a second tab — the listing appears in the moderation queue live.", "افتح الإدارة في تبويب ثانٍ — يظهر الإعلان في قائمة المراجعة مباشرة."),
      ],
      cta: { label: t("Go to pricing", "اذهب إلى الأسعار"), to: "/pricing" },
    },
    {
      icon: Megaphone,
      title: t("4 · Advertiser promotes a listing on Meta", "4 · المعلن يروّج إعلاناً على ميتا"),
      reqs: ["FR-ADV-04", "FR-ADV-09", "WP-MKT-02", "WP-MKT-03", "WP-MKT-04"],
      steps: [
        t("Advertiser dashboard → Listings → “Promote on Meta”.", "لوحة المعلن ← الإعلانات ← «روّج على ميتا»."),
        t("The marketing agent drafts audience, budget and AR/EN creatives.", "يقترح الوكيل التسويقي الجمهور والميزانية والتصاميم بالعربية والإنجليزية."),
        t("Add a prohibited exclusion to see the housing-policy block.", "أضف استبعاداً محظوراً لترى منع سياسة الإسكان."),
        t("Nothing is created or charged until the explicit approval gate.", "لا يتم إنشاء أو خصم أي شيء قبل الموافقة الصريحة."),
      ],
      cta: { label: t("Open advertiser portal", "افتح بوابة المعلن"), to: "/advertiser" },
    },
    {
      icon: ShieldCheck,
      title: t("5 · Moderator and support agent handle a report and a WhatsApp handover", "5 · المشرف وموظف الدعم يعالجان بلاغاً وتحويلاً من واتساب"),
      reqs: ["FR-LST-09", "FR-WAP-07", "FR-WAP-08", "FR-ADM-05"],
      steps: [
        t("Report a listing from its page; resolve it in Admin → Reports.", "أبلغ عن إعلان من صفحته؛ عالجه في الإدارة ← البلاغات."),
        t("Support inbox: the AI handed Fatima’s chat over — SLA timer is running.", "صندوق الدعم: حوّل المساعد محادثة فاطمة — مؤقت مستوى الخدمة يعمل."),
        t("Take over, reply, add an internal note, route the lead to the advertiser.", "استلم المحادثة ورد وأضف ملاحظة داخلية ووجّه العميل للمعلن."),
        t("Every action lands in the immutable audit trail.", "كل إجراء يُسجل في سجل التدقيق غير القابل للتعديل."),
      ],
      cta: { label: t("Open support inbox", "افتح صندوق الدعم"), to: "/inbox" },
    },
  ];

  const stack = [
    [t("Web & PWA", "الويب والتطبيق التقدمي"), "Next.js (SSR, bilingual routes), Tailwind RTL"],
    [t("Core API", "الواجهة الأساسية"), "NestJS modular monolith · OpenAPI"],
    [t("Data", "البيانات"), "PostgreSQL + PostGIS · Redis · S3 + CDN"],
    [t("Search", "البحث"), "OpenSearch with Arabic analyser + synonyms"],
    [t("Identity", "الهوية"), "Keycloak (OAuth 2 / OIDC, 2FA, future ERP SSO)"],
    [t("Events", "الأحداث"), "Outbox → BullMQ · signed webhooks for ERP"],
    [t("Messaging", "المراسلة"), "WhatsApp Cloud API · Meta Graph / Marketing API / CAPI"],
    [t("AI layer", "طبقة الذكاء"), "Vendor-agnostic tool layer · Claude · pgvector KB"],
    [t("Infra", "البنية"), "GCP Doha / Azure Qatar · Terraform · GitHub Actions · Sentry · OTel"],
  ];

  const realVsMock = {
    real: [
      t("Bilingual AR/EN with full RTL and Hijri dates", "عربي/إنجليزي مع اتجاه كامل من اليمين وتاريخ هجري"),
      t("Search, filters, Arabic normalisation, map search", "البحث والفلاتر وتطبيع العربية والبحث بالخريطة"),
      t("Listing moderation auto-checks", "الفحوصات التلقائية لمراجعة الإعلانات"),
      t("AI assistant with tool-based retrieval + grounding validation (Claude when an API key is set)", "مساعد ذكي باسترجاع عبر الأدوات وتحقق من الإسناد (Claude عند توفر المفتاح)"),
      t("Client-side photo compression and EXIF stripping", "ضغط الصور وإزالة بيانات الموقع في المتصفح"),
      t("Cross-tab live sync between portals", "مزامنة مباشرة بين البوابات في عدة تبويبات"),
    ],
    mock: [
      t("WhatsApp Cloud API & Meta APIs (simulated, same message shapes)", "واجهات واتساب وميتا (محاكاة بنفس شكل الرسائل)"),
      t("Payment gateway & 3-D Secure (decision D-02 pending)", "بوابة الدفع والتحقق (القرار D-02 معلق)"),
      t("Persistence is browser localStorage, not a database", "التخزين في المتصفح وليس قاعدة بيانات"),
      t("Login / OTP and roles (portals are open for the demo)", "تسجيل الدخول والرموز والأدوار (البوابات مفتوحة للعرض)"),
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white sm:p-10">
        <div className="text-sm font-semibold uppercase tracking-wider text-accent-400">MPT-PRJ-REQ-003 · {t("Interactive prototype", "نموذج تفاعلي")}</div>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{t("Demo guide", "دليل العرض")}</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          {t(
            "Five walkthroughs that mirror the UAT scenarios in §10.2 of the brief. Each card lists the requirement IDs it demonstrates.",
            "خمسة سيناريوهات تطابق اختبارات القبول في القسم 10.2 من الوثيقة. كل بطاقة تذكر أرقام المتطلبات التي توضحها.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {[
            [t("Public site", "الموقع العام"), "/"],
            [t("Advertiser", "المعلن"), "/advertiser"],
            [t("Admin", "الإدارة"), "/admin"],
            [t("Support inbox", "صندوق الدعم"), "/inbox"],
            [t("WhatsApp", "واتساب"), "/whatsapp"],
          ].map(([l, p]) => (
            <Link key={p} href={h(p)} className="rounded-full bg-white/10 px-4 py-1.5 font-medium hover:bg-white/20">
              {l}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
        {scenarios.map((s) => (
          <Card key={s.title} className="flex flex-col p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <s.icon className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-bold text-stone-900">{s.title}</h2>
            </div>
            <ol className="mt-4 space-y-2 text-sm text-stone-600">
              {s.steps.map((st, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-100 text-[11px] font-bold text-stone-600">{i + 1}</span>
                  {st}
                </li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-1">
              {s.reqs.map((r) => (
                <ReqTag key={r} id={r} />
              ))}
            </div>
            <Link href={h(s.cta.to)} className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand-600 hover:text-brand-700">
              {s.cta.label}
              <ArrowRight className="flip-rtl h-4 w-4" />
            </Link>
          </Card>
        ))}

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-stone-100 text-stone-700">
              <Building2 className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-bold text-stone-900">{t("Proposed production stack", "التقنيات المقترحة للإنتاج")}</h2>
          </div>
          <dl className="mt-4 divide-y divide-stone-100 text-sm">
            {stack.map(([k, v]) => (
              <div key={k} className="flex gap-4 py-2">
                <dt className="w-32 shrink-0 font-medium text-stone-500">{k}</dt>
                <dd className="text-stone-800" dir="ltr">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-stone-500">
            {t(
              "Every record carries an organisation ID; plans hold quotas and module entitlements; listing, lead and payment events go through an outbox, so an ERP connector can be added later without rework (§6).",
              "كل سجل يحمل معرف المؤسسة؛ والباقات تحمل الحصص وصلاحيات الوحدات؛ وأحداث الإعلانات والعملاء والدفع تمر عبر صندوق صادر، فيمكن إضافة ربط ERP لاحقاً دون إعادة بناء (القسم 6).",
            )}
          </p>
        </Card>
      </div>

      <Card className="mt-5 grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {t("Working in this prototype", "يعمل في هذا النموذج")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
            {realVsMock.real.map((x) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <CircleDashed className="h-5 w-5 text-amber-600" />
            {t("Simulated for the demo", "محاكاة لغرض العرض")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
            {realVsMock.mock.map((x) => (
              <li key={x}>• {x}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
