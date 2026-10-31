import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, CheckCircle2, CircleDashed, Play } from "lucide-react";
import { Card, ReqTag } from "@/components/ui";
import { StageBadge } from "@/lib/stage";
import { isLocale, tr, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Demo guide — UAT scenarios" };

type Step = { lane: number; en: string; ar: string; outcome?: boolean };
interface Scenario {
  id: string;
  title: [string, string];
  headline: [string, string];
  accept: [string, string];
  lanes: [string, string][];
  steps: Step[];
  stages: ("S1" | "S2")[];
  reqs: string[];
  run: { label: [string, string]; to: string }[];
}

const scenarios: Scenario[] = [
  {
    id: "C1",
    title: ["Find a property with the AI assistant", "ابحث عن عقار بالمساعد الذكي"],
    headline: ["The AI assistant recommends only live listings and hands leads to people", "المساعد يرشّح إعلانات حية فقط ويحوّل العملاء للموظفين"],
    accept: ["The assistant recommends only listings it retrieved, captures leads with consent, and a person can take over at any point.", "يرشّح المساعد فقط ما استرجعه، ويلتقط العملاء بموافقتهم، ويمكن لموظف التدخل في أي لحظة."],
    lanes: [["Seeker", "الباحث"], ["AI assistant", "المساعد الذكي"], ["AqarPro platform", "منصة عقار برو"], ["Support agent", "موظف الدعم"]],
    steps: [
      { lane: 0, en: "Opens chat on web or WhatsApp", ar: "يفتح المحادثة على الويب أو واتساب" },
      { lane: 1, en: "Asks purpose, budget, area, type, bedrooms", ar: "يسأل عن الغرض والميزانية والمنطقة والنوع والغرف" },
      { lane: 0, en: "Replies by text or voice note", ar: "يرد نصاً أو برسالة صوتية" },
      { lane: 2, en: "Searches live, active listings only", ar: "يبحث في الإعلانات الحية فقط" },
      { lane: 1, en: "Ranked shortlist with listing IDs + reasons", ar: "قائمة مرتبة بأرقام الإعلانات والأسباب" },
      { lane: 0, en: "Asks to enquire, gives consent", ar: "يطلب الاستفسار ويوافق" },
      { lane: 2, en: "Creates scored lead for the advertiser", ar: "ينشئ عميلاً مقيّماً للمعلن", outcome: true },
      { lane: 3, en: "Takes over on request or low confidence", ar: "يتولى المحادثة عند الطلب أو انخفاض الثقة" },
    ],
    stages: ["S2"],
    reqs: ["WP-SUP-01", "WP-SUP-02", "WP-SUP-03", "WP-SUP-05", "WP-SUP-06", "LED-01"],
    run: [
      { label: ["Home → “Ask AqarPro AI”", "الرئيسية ← «اسأل مساعد عقار برو»"], to: "/" },
      { label: ["Lead appears in lead manager", "يظهر العميل في إدارة العملاء"], to: "/advertiser/leads" },
      { label: ["Handover in support inbox", "التحويل في صندوق الدعم"], to: "/inbox" },
    ],
  },
  {
    id: "C2",
    title: ["Receive a property pack on WhatsApp", "استلم ملف العقار على واتساب"],
    headline: ["A WhatsApp request becomes a property pack and a routed lead", "طلب واتساب يتحول إلى ملف عقار وعميل موجّه"],
    accept: ["Consent is checked before anything is sent, and every enquiry reaches the owning advertiser with its listing context.", "يُتحقق من الموافقة قبل أي إرسال، ويصل كل استفسار إلى المعلن المالك مع سياق الإعلان."],
    lanes: [["Seeker", "الباحث"], ["AqarPro WhatsApp", "واتساب عقار برو"], ["Lead inbox", "صندوق العملاء"], ["Advertiser", "المعلن"]],
    steps: [
      { lane: 0, en: "Taps Send to WhatsApp on a listing", ar: "يضغط إرسال إلى واتساب في إعلان" },
      { lane: 1, en: "Checks opt-in, logs consent", ar: "يتحقق من الموافقة ويسجلها" },
      { lane: 1, en: "Sends summary: price, area, rooms, map pin", ar: "يرسل الملخص: السعر والمساحة والغرف والموقع" },
      { lane: 1, en: "Sends room media, retries on failure", ar: "يرسل صور الغرف ويعيد عند الفشل" },
      { lane: 0, en: "Taps a button: more photos, similar, agent", ar: "يضغط زراً: صور أكثر، مشابه، موظف" },
      { lane: 2, en: "Creates lead with listing ID + source", ar: "ينشئ عميلاً برقم الإعلان والمصدر" },
      { lane: 3, en: "Gets lead by WhatsApp, email or dashboard", ar: "يستلم العميل عبر واتساب أو البريد أو اللوحة", outcome: true },
    ],
    stages: ["S1", "S2"],
    reqs: ["FR-WAP-02", "FR-WAP-06", "FR-WAP-03", "FR-WAP-04", "FR-WAP-08", "LED-01"],
    run: [
      { label: ["Open listing AQ-10231", "افتح الإعلان AQ-10231"], to: "/listing/AQ-10231" },
      { label: ["WhatsApp property pack", "ملف العقار على واتساب"], to: "/whatsapp?listing=AQ-10231&pack=1" },
      { label: ["Advertiser lead manager", "إدارة عملاء المعلن"], to: "/advertiser/leads" },
    ],
  },
  {
    id: "C3",
    title: ["Advertiser subscribes, pays and posts a listing", "المعلن يشترك ويدفع وينشر إعلاناً"],
    headline: ["Verified, paying advertisers go live only after moderation", "المعلنون الموثقون والمشتركون ينشرون فقط بعد المراجعة"],
    accept: ["Payment callbacks are applied exactly once, and no listing goes live without automatic checks and moderator approval.", "يُطبَّق إشعار الدفع مرة واحدة فقط، ولا يُنشر أي إعلان دون الفحص التلقائي وموافقة المشرف."],
    lanes: [["Advertiser", "المعلن"], ["AqarPro platform", "منصة عقار برو"], ["Payment gateway", "بوابة الدفع"], ["Moderator", "المشرف"]],
    steps: [
      { lane: 0, en: "Registers, uploads QID or CR + licence", ar: "يسجل ويرفع البطاقة أو السجل والرخصة" },
      { lane: 3, en: "Approves verification, grants verified badge", ar: "يوافق على التوثيق ويمنح الشارة" },
      { lane: 0, en: "Chooses a plan, pays online", ar: "يختار باقة ويدفع إلكترونياً" },
      { lane: 2, en: "3-D Secure payment, sends callback", ar: "دفع آمن وإرسال الإشعار" },
      { lane: 1, en: "Applies callback once, issues AR/EN invoice", ar: "يطبق الإشعار مرة واحدة ويصدر فاتورة" },
      { lane: 0, en: "Creates listing with room-tagged photos", ar: "ينشئ إعلاناً بصور مصنفة" },
      { lane: 1, en: "Auto checks and plan quota enforced", ar: "فحص تلقائي وتطبيق حد الباقة" },
      { lane: 3, en: "Approves listing", ar: "يوافق على الإعلان" },
      { lane: 1, en: "Listing goes live", ar: "يُنشر الإعلان", outcome: true },
    ],
    stages: ["S1"],
    reqs: ["FR-ACC-01", "FR-ACC-03", "FR-BIL-02", "FR-BIL-03", "WP-BIL-08", "FR-LST-03", "FR-LST-05", "BIL-09"],
    run: [
      { label: ["Register & upload documents", "التسجيل ورفع المستندات"], to: "/register" },
      { label: ["Admin → Verification", "الإدارة ← التوثيق"], to: "/admin?tab=verification" },
      { label: ["Choose plan & pay", "اختر باقة وادفع"], to: "/pricing" },
      { label: ["Post a listing", "أضف إعلاناً"], to: "/advertiser/new" },
      { label: ["Admin → Moderation", "الإدارة ← المراجعة"], to: "/admin?tab=moderation" },
    ],
  },
  {
    id: "C4",
    title: ["Agency publishes an AI Studio listing to two portals", "الوكالة تنشر إعلاناً من الاستوديو الذكي على بوابتين"],
    headline: ["One canonical listing reaches two portals without duplicates", "إعلان رئيسي واحد يصل إلى بوابتين دون تكرار"],
    accept: ["The portal timeout is retried safely without creating a duplicate, and both portal states show on the dashboard.", "تُعاد محاولة النشر بأمان بعد انتهاء المهلة دون تكرار، وتظهر حالة البوابتين في اللوحة."],
    lanes: [["Agency user", "مستخدم الوكالة"], ["AI Listing Studio", "الاستوديو الذكي"], ["Integration Hub", "مركز الربط"], ["Portals (mock)", "البوابات (تجريبية)"]],
    steps: [
      { lane: 0, en: "Creates property, uploads photos", ar: "ينشئ العقار ويرفع الصور" },
      { lane: 1, en: "Drafts AR + EN text, flags missing fields", ar: "يكتب النص بالعربية والإنجليزية ويحدد النواقص" },
      { lane: 0, en: "Corrects details, picks two portals", ar: "يصحح التفاصيل ويختار بوابتين" },
      { lane: 2, en: "Builds two versions, flags a missing field", ar: "ينشئ نسختين ويحدد حقلاً ناقصاً" },
      { lane: 0, en: "Fixes the field, approves publishing", ar: "يصلح الحقل ويوافق على النشر" },
      { lane: 3, en: "Portal A succeeds; portal B times out", ar: "البوابة أ تنجح والبوابة ب تنتهي مهلتها" },
      { lane: 2, en: "Safe retry with idempotency key", ar: "إعادة آمنة بمفتاح منع التكرار" },
      { lane: 2, en: "Dashboard shows status per portal", ar: "اللوحة تعرض الحالة لكل بوابة", outcome: true },
    ],
    stages: ["S1"],
    reqs: ["AIS-01", "AIS-02", "AIS-03", "AIS-06", "HUB-04", "HUB-05", "HUB-07", "HUB-08", "FR-LST-12"],
    run: [
      { label: ["AI Listing Studio", "الاستوديو الذكي"], to: "/advertiser/studio" },
      { label: ["Portal Integration Hub", "مركز ربط البوابات"], to: "/hub" },
    ],
  },
  {
    id: "C5",
    title: ["Advertiser promotes a listing on Meta", "المعلن يروّج إعلاناً على ميتا"],
    headline: ["No campaign is created or funded without advertiser approval", "لا تُنشأ أي حملة أو تُموَّل دون موافقة المعلن"],
    accept: ["The approval gate and spend caps are enforced by the platform, not the AI; the marketing agent only drafts and suggests.", "بوابة الموافقة وحدود الإنفاق تفرضها المنصة لا الذكاء الاصطناعي؛ الوكيل يصوغ ويقترح فقط."],
    lanes: [["Advertiser", "المعلن"], ["Marketing agent", "وكيل التسويق"], ["AqarPro controls", "ضوابط عقار برو"], ["Meta", "ميتا"]],
    steps: [
      { lane: 0, en: "Clicks Promote this listing", ar: "يضغط روّج لهذا الإعلان" },
      { lane: 1, en: "Drafts objective, audience, budget, copy", ar: "يصوغ الهدف والجمهور والميزانية والنص" },
      { lane: 2, en: "Policy check: housing rules, spend caps", ar: "فحص السياسة: قواعد الإسكان وحدود الإنفاق" },
      { lane: 0, en: "Reviews and approves campaign", ar: "يراجع ويعتمد الحملة", outcome: true },
      { lane: 2, en: "Creates campaign via Marketing API", ar: "ينشئ الحملة عبر واجهة التسويق" },
      { lane: 3, en: "Runs ad, captures Lead Ads + CTWA leads", ar: "يعرض الإعلان ويلتقط العملاء" },
      { lane: 2, en: "Leads to inbox; spend + fee billed", ar: "العملاء إلى الصندوق وفوترة الإنفاق والرسوم" },
      { lane: 1, en: "Weekly summary, suggestions only", ar: "ملخص أسبوعي واقتراحات فقط" },
    ],
    stages: ["S2"],
    reqs: ["FR-ADV-04", "FR-ADV-06", "FR-ADV-07", "FR-ADV-09", "WP-MKT-01", "WP-MKT-02", "WP-MKT-03", "WP-MKT-04", "WP-MKT-05"],
    run: [
      { label: ["Promote AQ-10233", "روّج للإعلان AQ-10233"], to: "/advertiser/promote/AQ-10233" },
      { label: ["Meta leads in lead manager", "عملاء ميتا في إدارة العملاء"], to: "/advertiser/leads" },
    ],
  },
  {
    id: "C6",
    title: ["Moderator and support agent handle a report and a WhatsApp handover", "المشرف وموظف الدعم يعالجان بلاغاً وتحويلاً من واتساب"],
    headline: ["Listing reports reach moderators and WhatsApp chats reach a person", "البلاغات تصل للمشرفين ومحادثات واتساب تصل لموظف"],
    accept: ["Two independent flows: a listing report (top) and a WhatsApp handover (bottom).", "تدفقان مستقلان: بلاغ عن إعلان (أعلى) وتحويل من واتساب (أسفل)."],
    lanes: [["Seeker", "الباحث"], ["AI assistant", "المساعد الذكي"], ["Support agent", "موظف الدعم"], ["Moderator", "المشرف"], ["Advertiser", "المعلن"]],
    steps: [
      { lane: 0, en: "Reports a listing", ar: "يبلّغ عن إعلان" },
      { lane: 3, en: "Reviews report in the queue", ar: "يراجع البلاغ في القائمة" },
      { lane: 3, en: "Pauses or rejects with a reason", ar: "يوقف أو يرفض مع السبب" },
      { lane: 4, en: "Notified; fixes and resubmits", ar: "يُبلَّغ ويصلح ويعيد الإرسال" },
      { lane: -1, en: "", ar: "" },
      { lane: 0, en: "Asks on WhatsApp for a person", ar: "يطلب موظفاً على واتساب" },
      { lane: 1, en: "Hands over with full transcript", ar: "يحوّل مع المحادثة كاملة" },
      { lane: 2, en: "Assigns, replies, closes within SLA", ar: "يعيّن ويرد ويغلق ضمن مستوى الخدمة", outcome: true },
    ],
    stages: ["S1", "S2"],
    reqs: ["FR-LST-09", "FR-LST-05", "FR-WAP-07", "WP-SUP-06", "WP-SUP-09", "FR-ADM-05"],
    run: [
      { label: ["Report listing AQ-10246", "أبلغ عن الإعلان AQ-10246"], to: "/listing/AQ-10246" },
      { label: ["Admin → Reports", "الإدارة ← البلاغات"], to: "/admin?tab=reports" },
      { label: ["Advertiser fixes & resubmits", "المعلن يصلح ويعيد الإرسال"], to: "/advertiser" },
      { label: ["WhatsApp → ask for a person", "واتساب ← اطلب موظفاً"], to: "/whatsapp" },
      { label: ["Support inbox", "صندوق الدعم"], to: "/inbox" },
    ],
  },
];

const appendixA: [string, string, string][] = [
  ["An agency user creates a property and uploads photos and basic details.", "ينشئ مستخدم الوكالة عقاراً ويرفع الصور والتفاصيل الأساسية.", "/advertiser/studio"],
  ["AI proposes Arabic and English descriptions and flags missing information.", "يقترح الذكاء الاصطناعي أوصافاً بالعربية والإنجليزية ويحدد النواقص.", "/advertiser/studio"],
  ["The user corrects details and submits the listing for validation.", "يصحح المستخدم التفاصيل ويرسل الإعلان للتحقق.", "/advertiser/studio"],
  ["The user selects two destination portals.", "يختار المستخدم بوابتين للنشر.", "/advertiser/studio"],
  ["The Hub creates two portal-specific versions and flags a required field missing for one.", "ينشئ المركز نسختين ويحدد حقلاً مطلوباً ناقصاً في إحداهما.", "/hub"],
  ["The user corrects the field and approves publishing.", "يصحح المستخدم الحقل ويوافق على النشر.", "/hub"],
  ["One mock connector succeeds; the other times out after submission.", "ينجح موصل ويتأخر الآخر بعد الإرسال.", "/hub"],
  ["The Hub records outcomes, retries safely and prevents duplicate creation.", "يسجل المركز النتائج ويعيد المحاولة بأمان ويمنع التكرار.", "/hub"],
  ["The dashboard shows each destination state and the action required.", "تعرض اللوحة حالة كل وجهة والإجراء المطلوب.", "/hub"],
  ["An enquiry arrives through a mock endpoint and WhatsApp and appears in the central lead inbox with source attribution.", "يصل استفسار عبر نقطة تجريبية وواتساب ويظهر في صندوق العملاء مع المصدر.", "/advertiser/leads"],
  ["The AI assistant answers a seeker's question citing real listing IDs, then hands over to a human agent.", "يجيب المساعد مستشهداً بأرقام إعلانات حقيقية ثم يحوّل إلى موظف.", "/"],
];

function Swimlane({ s, lang }: { s: Scenario; lang: Locale }) {
  const cols = s.lanes.length;
  const grid = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };
  // Step numbers skip the dashed divider rows.
  const numbers = s.steps.map((_, i) => s.steps.slice(0, i + 1).filter((x) => x.lane >= 0).length);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] overflow-hidden rounded-xl border border-stone-200">
        <div className="grid" style={grid}>
          {s.lanes.map((l, i) => (
            <div key={i} className={`border-b border-stone-200 px-2 py-2 text-center text-xs font-semibold text-stone-700 ${i % 2 ? "bg-white" : "bg-stone-100"}`}>
              {tr(lang, l[0], l[1])}
            </div>
          ))}
        </div>
        <div className="grid" style={grid}>
          {s.steps.map((st, i) => {
            if (st.lane < 0)
              return <div key={i} className="border-t border-dashed border-stone-300" style={{ gridColumn: `1 / span ${cols}`, gridRow: i + 1 }} />;
            return s.lanes.map((_, lane) => (
              <div key={`${i}-${lane}`} className={`px-2 py-1.5 ${lane % 2 ? "bg-white" : "bg-stone-50"}`} style={{ gridColumn: lane + 1, gridRow: i + 1 }}>
                {lane === st.lane && (
                  <div
                    className={`rounded-lg border px-2 py-1.5 text-center text-[11px] leading-snug shadow-sm ${
                      st.outcome ? "border-brand-500 bg-brand-50 font-semibold text-brand-900 ring-2 ring-brand-200" : "border-stone-300 bg-white text-stone-700"
                    }`}
                  >
                    <span className="me-1 font-mono text-[9px] text-stone-400">{numbers[i]}</span>
                    {tr(lang, st.en, st.ar)}
                  </div>
                )}
              </div>
            ));
          })}
        </div>
      </div>
    </div>
  );
}

export default async function DemoPage({ params }: PageProps<"/[lang]/demo">) {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = (en: string, ar: string) => tr(lang, en, ar);
  const h = (p: string) => `/${lang}${p}`;

  const stack = [
    [t("Web & PWA", "الويب والتطبيق التقدمي"), "Next.js (SSR, bilingual routes), Tailwind RTL"],
    [t("Core API", "الواجهة الأساسية"), "NestJS modular monolith · OpenAPI · Hub as a core module"],
    [t("Data", "البيانات"), "PostgreSQL + PostGIS · Redis · S3-compatible storage + CDN"],
    [t("Search", "البحث"), "OpenSearch with Arabic analyser + synonyms"],
    [t("Identity", "الهوية"), "Keycloak (OAuth 2 / OIDC, 2FA, tenant roles, future ERP SSO)"],
    [t("Jobs & events", "المهام والأحداث"), "Outbox → BullMQ durable queue · idempotent connectors · signed webhooks"],
    [t("Messaging", "المراسلة"), "WhatsApp Cloud API · Meta Graph / Marketing API / CAPI"],
    [t("AI layer", "طبقة الذكاء"), "Provider-agnostic tools · Claude · OCR + speech-to-text · pgvector KB"],
    [t("Infra", "البنية"), "Qatar/GCC cloud region · Terraform · GitHub Actions · Sentry · OpenTelemetry"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white sm:p-10">
        <div className="text-sm font-semibold uppercase tracking-wider text-accent-400">AQP-REQ-001 · AqarPro · {t("Interactive prototype", "نموذج تفاعلي")}</div>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{t("Demo guide — UAT scenarios", "دليل العرض — سيناريوهات القبول")}</h1>
        <p className="mt-3 max-w-2xl text-brand-100">
          {t(
            "Six swimlanes, one per UAT scenario in §11. Lanes are the actors, steps run top to bottom, and the highlighted step is the outcome each test must prove. Use the S1 / S1 + S2 switch in the header to demo one stage at a time.",
            "ستة مخططات، واحد لكل سيناريو قبول في القسم 11. الأعمدة هي الأطراف، والخطوات من الأعلى للأسفل، والخطوة المميزة هي النتيجة المطلوب إثباتها. استخدم مفتاح المرحلة في الأعلى لعرض مرحلة واحدة.",
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {[
            [t("Roadmap by stage", "خارطة الطريق"), "/roadmap"],
            [t("Prototype audit (S0)", "تدقيق النموذج (S0)"), "/audit"],
            [t("Agency dashboard", "لوحة الوكالة"), "/advertiser"],
            [t("Admin", "الإدارة"), "/admin"],
            [t("Support inbox", "صندوق الدعم"), "/inbox"],
          ].map(([l, p]) => (
            <Link key={p} href={h(p)} className="rounded-full bg-white/10 px-4 py-1.5 font-medium hover:bg-white/20">
              {l}
            </Link>
          ))}
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:border-brand-300 hover:text-brand-700">
            {s.id} · {tr(lang, s.title[0], s.title[1])}
          </a>
        ))}
        <a href="#appendix-a" className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:border-brand-300">
          {t("Appendix A", "الملحق أ")}
        </a>
      </nav>

      <div className="mt-6 space-y-6">
        {scenarios.map((s) => (
          <Card key={s.id} className="p-5 sm:p-6">
            <div id={s.id} className="scroll-mt-24">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-navy-900 px-2 py-0.5 font-mono text-xs font-bold text-white">{s.id}</span>
                {s.stages.map((st) => (
                  <StageBadge key={st} s={st} />
                ))}
              </div>
              <h2 className="mt-2 text-lg font-bold text-stone-900">{tr(lang, s.title[0], s.title[1])}</h2>
              <p className="text-sm text-stone-500">{tr(lang, s.headline[0], s.headline[1])}</p>
            </div>

            <div className="mt-4">
              <Swimlane s={s} lang={lang} />
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-semibold">{t("Must prove: ", "المطلوب إثباته: ")}</span>
                {tr(lang, s.accept[0], s.accept[1])}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
                <Play className="h-3.5 w-3.5" />
                {t("Run this scenario:", "شغّل السيناريو:")}
              </span>
              {s.run.map((r, i) => (
                <span key={r.to + i} className="inline-flex items-center gap-2">
                  {i > 0 && <ArrowRight className="flip-rtl h-3.5 w-3.5 text-stone-300" />}
                  <Link href={h(r.to)} className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                    {i + 1}. {tr(lang, r.label[0], r.label[1])}
                  </Link>
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {s.reqs.map((r) => (
                <ReqTag key={r} id={r} />
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <div id="appendix-a" className="flex scroll-mt-24 items-center gap-2">
          <h2 className="text-lg font-bold text-stone-900">{t("Appendix A — Demonstration scenario", "الملحق أ — سيناريو العرض")}</h2>
          <StageBadge s="S1" />
        </div>
        <ol className="mt-4 space-y-2 text-sm">
          {appendixA.map((a, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone-100 text-xs font-bold text-stone-600">{i + 1}</span>
              <span className="flex-1 text-stone-700">{tr(lang, a[0], a[1])}</span>
              <Link href={h(a[2])} className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700">
                {t("Open", "فتح")}
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
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
                <dd className="text-stone-800" dir="ltr">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {t("Working in this prototype", "يعمل في هذا النموذج")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
            <li>• {t("Bilingual AR/EN with full RTL and Hijri dates", "عربي/إنجليزي مع اتجاه كامل وتاريخ هجري")}</li>
            <li>• {t("Search, map, moderation checks, report → resubmit", "البحث والخريطة والفحص والبلاغ ثم إعادة الإرسال")}</li>
            <li>• {t("Portal Hub validation, idempotent retry and status", "تحقق مركز الربط وإعادة آمنة وحالة")}</li>
            <li>• {t("AI Studio checks, lead manager, AI assistant grounding", "فحوص الاستوديو وإدارة العملاء وإسناد المساعد")}</li>
          </ul>
          <h2 className="mt-5 flex items-center gap-2 font-bold text-stone-900">
            <CircleDashed className="h-5 w-5 text-amber-600" />
            {t("Simulated for the demo", "محاكاة لغرض العرض")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
            <li>• {t("External portals, WhatsApp Cloud API and Meta APIs", "البوابات الخارجية وواتساب وواجهات ميتا")}</li>
            <li>• {t("Payment gateway and 3-D Secure (D-02 pending)", "بوابة الدفع (القرار D-02 معلق)")}</li>
            <li>• {t("Login/OTP; persistence is browser storage", "الدخول والرموز؛ التخزين في المتصفح")}</li>
          </ul>
          <Link href={h("/audit")} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
            {t("Full prototype audit", "تقرير التدقيق الكامل")}
            <ArrowRight className="flip-rtl h-4 w-4" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
