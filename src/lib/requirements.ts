import type { Bi } from "./i18n";

/**
 * Requirement registry for AQP-REQ-001 (AqarPro AI Website Platform — Final Requirements, R2).
 * Priority and stage are copied from the specification. `status` is the honest state of the
 * interactive prototype, not of the production platform.
 */
export type ReqStatus = "built" | "simulated" | "partial" | "planned";
export type ReqStage = "S0" | "S1" | "S2" | "S1/S2" | "All";

export interface Requirement {
  id: string;
  section: string;
  title: Bi;
  pri: "M" | "S" | "C" | "—";
  stage: ReqStage;
  status: ReqStatus;
  note: string;
  link?: string;
}

export interface Section {
  id: string;
  title: Bi;
}

export const sections: Section[] = [
  { id: "6.1", title: { en: "Public website and search", ar: "الموقع العام والبحث" } },
  { id: "6.2", title: { en: "Accounts, organisations and access", ar: "الحسابات والمؤسسات والصلاحيات" } },
  { id: "6.3", title: { en: "Property inventory and listing management", ar: "مخزون العقارات وإدارة الإعلانات" } },
  { id: "6.4", title: { en: "Portal Integration Hub", ar: "مركز ربط البوابات" } },
  { id: "6.5", title: { en: "AI Listing Studio", ar: "استوديو الإعلانات الذكي" } },
  { id: "6.6", title: { en: "Lead management", ar: "إدارة العملاء المحتملين" } },
  { id: "6.7", title: { en: "Subscription plans, billing and payments", ar: "الباقات والفوترة والمدفوعات" } },
  { id: "6.8", title: { en: "WhatsApp integration", ar: "تكامل واتساب" } },
  { id: "6.9", title: { en: "Meta handling and on-site advertising", ar: "ميتا والإعلانات داخل الموقع" } },
  { id: "6.10", title: { en: "Marketing agents", ar: "وكلاء التسويق" } },
  { id: "6.11", title: { en: "Support agents (AI assistant and human desk)", ar: "وكلاء الدعم (المساعد الذكي ومكتب الدعم)" } },
  { id: "6.12", title: { en: "Administration, analytics and compliance", ar: "الإدارة والتحليلات والامتثال" } },
  { id: "7", title: { en: "Architecture and future-readiness rules", ar: "البنية وقواعد الجاهزية المستقبلية" } },
  { id: "8", title: { en: "Non-functional requirements", ar: "المتطلبات غير الوظيفية" } },
];

type Row = [id: string, en: string, ar: string, pri: Requirement["pri"], stage: ReqStage, status: ReqStatus, note: string, link?: string];

const raw: Record<string, Row[]> = {
  "6.1": [
    ["FR-WEB-01", "Responsive bilingual site (AR RTL / EN)", "موقع متجاوب ثنائي اللغة", "M", "S1", "built", "Full RTL/LTR, language switch keeps the URL and query.", "/"],
    ["FR-WEB-02", "Home page: search, featured, categories, spotlight", "الصفحة الرئيسية", "M", "S1", "built", "Hero search, featured listings, type and area tiles, agency spotlight, verticals.", "/"],
    ["FR-WEB-03", "Search filters, sort and pagination", "البحث والفلاتر والترتيب", "M", "S1", "built", "Purpose, type, area, price, beds, baths, furnishing, amenities, Arabic-aware keyword.", "/search"],
    ["FR-WEB-04", "Map search and nearby points of interest", "البحث بالخريطة والمعالم القريبة", "S", "S1", "built", "OpenStreetMap; production would use the chosen maps provider.", "/search?view=map"],
    ["FR-WEB-05", "Listing page with room photos, map, enquiry, WhatsApp", "صفحة الإعلان", "M", "S1", "built", "Room-categorised gallery, floor plan, map, advertiser card, report, similar listings.", "/listing/AQ-10231"],
    ["FR-WEB-06", "Favourites, compare (4), saved-search alerts", "المفضلة والمقارنة والتنبيهات", "S", "S2", "simulated", "Works in the browser; alert delivery (email/WhatsApp) is simulated.", "/search"],
    ["FR-WEB-07", "SEO: SSR, bilingual URLs, OG tags, structured data", "تحسين محركات البحث", "M", "S1", "partial", "SSR pages, OG tags and RealEstateListing JSON-LD; sitemap to add in production.", "/listing/AQ-10231"],
    ["FR-WEB-08", "CMS pages (About, Pricing, Blog, FAQ, Terms…)", "صفحات نظام إدارة المحتوى", "M", "S1", "partial", "Pricing and FAQ exist; a headless CMS is planned for production.", "/pricing"],
  ],
  "6.2": [
    ["FR-ACC-01", "Email/password, mobile OTP, Google/Apple sign-in", "التسجيل والدخول", "M", "S1", "simulated", "Registration flow works; OTP and identity provider are mocked.", "/register"],
    ["FR-ACC-02", "Role-based access, organisations, tenant-scoped data", "الصلاحيات والمؤسسات", "M", "S1", "partial", "Owner / manager / agent / read-only roles enforced in the UI; server-side isolation is production work.", "/advertiser"],
    ["FR-ACC-03", "Advertiser verification (QID / CR, licence, badge)", "توثيق المعلنين", "M", "S1", "built", "Upload → moderator approval → verified badge.", "/admin?tab=verification"],
    ["FR-ACC-04", "Preferences and consent log with timestamps", "التفضيلات وسجل الموافقات", "M", "S1", "built", "WhatsApp/marketing consents recorded with time and source.", "/whatsapp"],
    ["FR-ACC-05", "2FA (mandatory for admin and moderators)", "التحقق الثنائي", "S", "S1", "simulated", "Shown as signed-in-with-2FA; real 2FA comes with the identity provider.", "/admin"],
    ["FR-ACC-06", "Account deletion and data export", "حذف الحساب وتصدير البيانات", "M", "S2", "planned", "Data-subject request workflow for production."],
  ],
  "6.3": [
    ["FR-LST-01", "Guided multi-step listing form with drafts", "نموذج إعلان متعدد الخطوات", "M", "S1", "built", "Five steps with autosave and validation.", "/advertiser/new"],
    ["FR-LST-02", "Structured fields, project/unit, bilingual text", "حقول منظمة ونص ثنائي اللغة", "M", "S1", "built", "Bilingual title/description with editable translation suggestion.", "/advertiser/new"],
    ["FR-LST-03", "Room-tagged photos, compression, watermark, EXIF strip", "صور مصنفة حسب الغرف", "M", "S1", "built", "Resized and re-encoded in the browser, which removes EXIF/GPS.", "/advertiser/new"],
    ["FR-LST-04", "Video, floor plan, documents, 360° tour", "فيديو ومخطط وجولة 360", "S", "S2", "partial", "Floor plan and links shown; video/document upload in production."],
    ["FR-LST-05", "Automatic checks + manual moderation queue", "الفحص التلقائي والمراجعة", "M", "S1", "built", "Contact details, duplicates, price outliers, permit, photo categories.", "/admin?tab=moderation"],
    ["FR-LST-06", "Lifecycle draft → pending → live → expired → archived", "دورة حياة الإعلان", "M", "S1", "built", "Pause, renew, expiry dates; reminders simulated.", "/advertiser"],
    ["FR-LST-07", "Featured / promoted placements, bump, badges", "التمييز والرفع", "M", "S1", "built", "Uses plan credits.", "/advertiser"],
    ["FR-LST-08", "Bulk upload (CSV/Excel) and feed/API", "الرفع الجماعي", "S", "S2", "planned", "Ingestion API designed with the Hub; UI in production."],
    ["FR-LST-09", "Report a listing; moderator handling; advertiser notice", "الإبلاغ عن إعلان", "M", "S1", "built", "Report → pause/reject with reason → advertiser fixes and resubmits.", "/admin?tab=reports"],
    ["FR-LST-10", "Listing analytics: views, saves, enquiries, WhatsApp", "إحصاءات الإعلان", "M", "S1", "built", "Per-listing stats and source channels (demo data).", "/advertiser"],
    ["FR-LST-11", "Availability, price history, assigned agent, change history", "سجل الأسعار والتغييرات", "M", "S1", "built", "Price history and field-level change log.", "/advertiser"],
    ["FR-LST-12", "Canonical record separate from portal versions", "سجل رئيسي منفصل عن نسخ البوابات", "M", "S1", "built", "Portal versions stored with their own IDs, payload versions and status.", "/hub"],
  ],
  "6.4": [
    ["HUB-01", "Canonical listing model with stable IDs and tenant", "نموذج إعلان رئيسي", "M", "S1", "built", "Every record carries an organisation ID.", "/hub"],
    ["HUB-02", "Connector interface and capability registry", "واجهة الموصلات وسجل القدرات", "M", "S1", "built", "Portal A full API; Portal B publish-only (no unpublish/leads).", "/hub"],
    ["HUB-03", "Portal connections and secure credential storage", "إدارة الاتصالات والاعتمادات", "M", "S1", "simulated", "Credentials shown as vault references only.", "/hub"],
    ["HUB-04", "Field mapping, transformation, deterministic validation", "مطابقة الحقول والتحقق", "M", "S1", "built", "Per-portal rules flag missing fields before publishing.", "/advertiser/studio"],
    ["HUB-05", "Publishing orchestrator and durable job queue", "منسق النشر وطابور المهام", "M", "S1", "simulated", "Queue runs in the browser; production uses a durable queue (BullMQ).", "/hub"],
    ["HUB-06", "Connector contract: create/update/unpublish/status/leads", "عقد الموصل", "M", "S1", "built", "Only capabilities the portal declares are offered.", "/hub"],
    ["HUB-07", "Dashboard: job status, errors, retries, reprocessing", "لوحة حالة المهام", "M", "S1", "built", "", "/hub"],
    ["HUB-08", "Duplicate prevention, idempotency, external IDs", "منع التكرار ومفاتيح عدم التكرار", "M", "S1", "built", "Timeout is retried with the same idempotency key — no duplicate.", "/hub"],
    ["HUB-09", "Sync timestamps, payload versions, audit trail", "طوابع المزامنة وإصدارات الحمولة", "M", "S1", "built", "", "/hub"],
    ["HUB-10", "Rate limiting, connector health, alerts", "حدود المعدل وصحة الموصلات", "M", "S1", "simulated", "Health and limits displayed; alerting is production work.", "/hub"],
    ["HUB-11", "Mock connector with success/reject/timeout/retry/duplicate tests", "موصل تجريبي مع اختبارات", "M", "S1", "built", "Scenarios can be triggered from the Hub.", "/hub"],
    ["HUB-12", "First live portal connector", "أول موصل حي", "M", "S2", "planned", "Depends on authorised portal access (D-09)."],
    ["HUB-13", "Connector onboarding guide", "دليل إضافة موصل", "M", "S1", "partial", "Capability registry in code; written guide delivered with the build."],
  ],
  "6.5": [
    ["AIS-01", "AI intake from text, documents, images, voice", "إدخال ذكي من النص والمستندات والصور والصوت", "M", "S1", "simulated", "Extraction runs on a rules engine; Claude / OCR / speech-to-text in production.", "/advertiser/studio"],
    ["AIS-02", "AR/EN descriptions, short/long and portal versions", "أوصاف عربية وإنجليزية", "M", "S1", "built", "", "/advertiser/studio"],
    ["AIS-03", "Missing-field, inconsistency and quality checks", "فحص الحقول الناقصة والجودة", "M", "S1", "built", "", "/advertiser/studio"],
    ["AIS-04", "Editable drafts; human approval before publishing", "مسودات قابلة للتعديل وموافقة بشرية", "M", "S1", "built", "", "/advertiser/studio"],
    ["AIS-05", "AI usage tracking, quotas, provider abstraction", "تتبع الاستخدام والحصص", "M", "S1", "built", "Credits metered against the plan.", "/advertiser/studio"],
    ["AIS-06", "Never fabricate facts; AI suggestions marked", "عدم اختلاق الحقائق", "M", "S1", "built", "AI-suggested fields stay flagged until a person confirms them.", "/advertiser/studio"],
    ["AIS-07", "Image enhancement disclosed, never misleading", "الإفصاح عن تحسين الصور", "M", "S1", "partial", "Disclosure rule shown; image enhancement itself is production work."],
  ],
  "6.6": [
    ["LED-01", "Central leads from web, WhatsApp, portals, AI, Meta", "عملاء من كل القنوات", "M", "S1/S2", "built", "Source attribution on every lead (S1 basic, S2 full).", "/advertiser/leads"],
    ["LED-02", "Assignment, status, notes, follow-up tasks", "التعيين والحالة والمهام", "M", "S1", "built", "", "/advertiser/leads"],
    ["LED-03", "Duplicate lead detection", "كشف العملاء المكررين", "M", "S1", "built", "", "/advertiser/leads"],
    ["LED-04", "AI classification, scoring and reply drafts", "تصنيف وتقييم ذكي", "S", "S2", "simulated", "", "/advertiser/leads"],
    ["LED-05", "Inbound portal/channel lead integrations", "استقبال العملاء من البوابات", "S", "S2", "simulated", "Portal A supports lead retrieval; Portal B does not.", "/advertiser/leads"],
    ["LED-06", "Lead reporting: volume, source, response time, outcome", "تقارير العملاء", "M", "S1", "built", "", "/advertiser/leads"],
  ],
  "6.7": [
    ["FR-BIL-01", "Configurable plan engine incl. AI credits and flags", "محرك الباقات", "M", "S1", "built", "Quotas, seats, AI credits, portal connections, feature flags.", "/admin?tab=plans"],
    ["FR-BIL-02", "Qatar gateway, 3-D Secure, bank transfer", "بوابة دفع قطرية", "M", "S1", "simulated", "Gateway choice is decision D-02.", "/pricing"],
    ["FR-BIL-03", "Sequential bilingual invoices (PDF)", "فواتير ثنائية اللغة", "M", "S1", "built", "", "/pricing"],
    ["FR-BIL-04", "Upgrade/downgrade, proration, renewal, dunning", "الترقية والتجديد والتحصيل", "M", "S1", "partial", "Proration shown at checkout; renewal/dunning jobs in production.", "/pricing"],
    ["FR-BIL-05", "Pay-per-use add-ons", "إضافات حسب الاستخدام", "S", "S2", "partial", "Listed on pricing; checkout per add-on in production.", "/pricing"],
    ["FR-BIL-06", "Coupons, trials, referral credits", "قسائم وتجارب", "C", "S2", "planned", ""],
    ["FR-BIL-07", "Finance reports, MRR/churn, accounting export", "تقارير مالية", "S", "S2", "partial", "Revenue overview in admin.", "/admin"],
    ["WP-BIL-08", "Payment callbacks verified, processed exactly once", "معالجة إشعار الدفع مرة واحدة", "M", "S1", "simulated", "", "/pricing"],
    ["BIL-09", "Limits and AI quotas enforced server-side; fees separated", "فرض الحدود على الخادم", "M", "S1", "partial", "Enforced in the prototype UI; server enforcement in production."],
  ],
  "6.8": [
    ["FR-WAP-01", "Official number; webhooks for messages and statuses", "رقم رسمي وخطافات", "M", "S1", "simulated", "Cloud API shapes simulated.", "/whatsapp"],
    ["FR-WAP-02", "Send to / Chat on WhatsApp with listing ID", "زر واتساب مع رقم الإعلان", "M", "S1", "built", "", "/listing/AQ-10231"],
    ["FR-WAP-06", "Opt-in and STOP handling; consent log", "الموافقة وإلغاء الاشتراك", "M", "S1", "built", "", "/whatsapp"],
    ["FR-WAP-03", "Property pack: summary + room media, retries", "ملف العقار", "M", "S2", "simulated", "", "/whatsapp?listing=AQ-10231&pack=1"],
    ["FR-WAP-04", "Interactive buttons and list menus", "أزرار وقوائم تفاعلية", "M", "S2", "simulated", "", "/whatsapp"],
    ["FR-WAP-05", "Template management with approval tracking", "إدارة القوالب", "M", "S2", "simulated", "", "/whatsapp"],
    ["FR-WAP-07", "Shared agent inbox, handover, SLA timers", "صندوق الوكلاء المشترك", "M", "S2", "built", "", "/inbox"],
    ["FR-WAP-08", "Lead routing to the owning advertiser", "توجيه العميل للمعلن", "M", "S2", "built", "", "/inbox"],
    ["FR-WAP-10", "Click-to-WhatsApp source attribution", "نسب مصدر الإعلانات", "S", "S2", "simulated", ""],
    ["FR-WAP-11", "WhatsApp analytics and cost per conversation", "تحليلات واتساب", "S", "S2", "partial", ""],
  ],
  "6.9": [
    ["FR-ADV-01", "On-site ad inventory with scheduling and tracking", "مخزون الإعلانات داخل الموقع", "M", "S1", "built", "", "/admin?tab=ads"],
    ["FR-ADV-02", "Meta Pixel + Conversions API with consent", "بكسل ميتا وواجهة التحويلات", "M", "S1", "simulated", "Events shown on screen with a shared event ID.", "/listing/AQ-10231"],
    ["FR-ADV-03", "Catalogue feed of live listings to Meta", "كتالوج ميتا", "S", "S2", "planned", ""],
    ["FR-ADV-04", "Promote this listing via Marketing API after approval", "روّج لهذا الإعلان", "S", "S2", "simulated", "", "/advertiser/promote/AQ-10233"],
    ["FR-ADV-05", "Custom/lookalike audiences from consented data", "جماهير مخصصة", "S", "S2", "planned", ""],
    ["FR-ADV-06", "Lead Ads and Click-to-WhatsApp leads into the inbox", "عملاء إعلانات ميتا", "S", "S2", "simulated", "", "/advertiser/leads"],
    ["FR-ADV-07", "Campaign dashboard; spend + service fee billing", "لوحة الحملات", "S", "S2", "simulated", "", "/advertiser/promote/AQ-10233"],
    ["FR-ADV-08", "Approved auto-posting to AqarPro pages", "النشر التلقائي المعتمد", "C", "S2", "planned", ""],
    ["FR-ADV-09", "Housing special ad-category compliance", "الامتثال لفئة الإسكان", "M", "S2", "built", "Prohibited targeting is blocked with a reason.", "/advertiser/promote/AQ-10233"],
  ],
  "6.10": [
    ["WP-MKT-01", "Campaign drafting from a listing", "صياغة حملة من إعلان", "S", "S2", "simulated", "", "/advertiser/promote/AQ-10233"],
    ["WP-MKT-02", "Approval gate enforced by the application", "بوابة موافقة يفرضها التطبيق", "M", "S2", "built", "", "/advertiser/promote/AQ-10233"],
    ["WP-MKT-03", "Policy check before submission", "فحص السياسة قبل الإرسال", "M", "S2", "built", "", "/advertiser/promote/AQ-10233"],
    ["WP-MKT-04", "Spend caps; spend and fee shown separately", "حدود الإنفاق", "M", "S2", "built", "", "/advertiser/promote/AQ-10233"],
    ["WP-MKT-05", "Weekly plain-language summary", "ملخص أسبوعي", "S", "S2", "simulated", "", "/advertiser/promote/AQ-10233"],
    ["WP-MKT-06", "Organic post drafting into approval queue", "صياغة المنشورات", "C", "S2", "planned", ""],
    ["WP-MKT-07", "Controlled tools, server-side credentials, logging", "أدوات مضبوطة ومسجلة", "M", "S2", "built", "Tool-call log visible on the promote page.", "/advertiser/promote/AQ-10233"],
  ],
  "6.11": [
    ["WP-SUP-01", "AI assistant on web and WhatsApp, AR/EN", "مساعد ذكي على الويب وواتساب", "M", "S2", "built", "Rules engine by default; Claude when an API key is set.", "/"],
    ["WP-SUP-02", "Guided discovery from text and voice notes", "اكتشاف موجّه بالنص والصوت", "M", "S2", "simulated", "Voice transcription simulated.", "/"],
    ["WP-SUP-03", "Live listings only; every recommendation cites an ID", "ترشيحات من إعلانات حية فقط", "M", "S2", "built", "Unverified IDs are stripped by a validation layer.", "/"],
    ["WP-SUP-04", "Answers from a managed knowledge base with source", "إجابات من قاعدة معرفة", "M", "S2", "built", "", "/"],
    ["WP-SUP-05", "Lead capture with consent, scored", "التقاط العملاء بالموافقة", "M", "S2", "built", "", "/"],
    ["WP-SUP-06", "Human handover with transcript", "التحويل إلى موظف", "M", "S2", "built", "", "/inbox"],
    ["WP-SUP-07", "Guardrails: disclaimers, injection resistance, PII, limits", "الضوابط", "M", "S2", "partial", "Disclaimers, rate limit and grounding in place; red-team tests in production."],
    ["WP-SUP-08", "Admin console: transcripts, KB, prompts, cost, quality", "لوحة إدارة الذكاء الاصطناعي", "S", "S2", "simulated", "", "/admin?tab=ai"],
    ["WP-SUP-09", "Unified human support inbox (basic list in S1)", "صندوق دعم موحد", "M", "S1/S2", "built", "S1 basic enquiry list; S2 full shared inbox.", "/inbox"],
    ["WP-SUP-10", "Evaluation set ≥ 100 AR/EN chats; ≤ 1% hallucination; p95 ≤ 6 s", "مجموعة تقييم", "M", "S2", "planned", "Figures in the admin console are sample values."],
  ],
  "6.12": [
    ["FR-ADM-01", "Admin dashboard incl. portal status and AI usage", "لوحة الإدارة", "M", "S1", "built", "", "/admin"],
    ["FR-ADM-02", "Manage users, orgs, plans, taxonomies, CMS, integrations", "إدارة الإعدادات دون مطور", "M", "S1", "partial", "Plans, ads, templates and flags editable; taxonomies/CMS in production.", "/admin?tab=plans"],
    ["FR-ADM-04", "Notification engine with templates and delivery log", "محرك الإشعارات", "M", "S1", "simulated", "Delivery providers mocked.", "/admin?tab=notifications"],
    ["FR-ADM-05", "Immutable audit trail incl. AI actions", "سجل تدقيق غير قابل للتعديل", "M", "S1", "built", "Hash-chained in the prototype.", "/admin?tab=audit"],
    ["FR-ADM-06", "Reports and scheduled email exports", "التقارير المجدولة", "S", "S2", "partial", "CSV export works; scheduling in production.", "/admin?tab=audit"],
    ["FR-ADM-07", "Feature flags for staged rollout", "مفاتيح الميزات", "S", "S1", "built", "", "/admin?tab=flags"],
    ["CMP-01", "Compliance/document checklist with expiry reminders", "قائمة الامتثال والمستندات", "M", "S1", "built", "Never presented as government or legal approval.", "/advertiser"],
  ],
  "7": [
    ["WP-ERX-01", "Organisation ID on every record; tenant isolation tests", "معرف المؤسسة وعزل المستأجرين", "M", "S1", "partial", "Org ID on all records; cross-tenant tests belong to the production backend."],
    ["WP-ERX-02", "Listing source field, ingestion API, signed webhooks", "واجهة الإدخال والخطافات الموقعة", "M", "S2", "planned", ""],
    ["WP-ERX-03", "Plan engine holds quotas, seats, modules, flags", "محرك باقات عام", "M", "S1", "built", "", "/admin?tab=plans"],
    ["WP-ERX-04", "Configurable listing-type engine", "محرك أنواع الإعلانات", "M", "S1", "planned", ""],
    ["WP-ERX-05", "OAuth 2 / OIDC for future ERP SSO", "OAuth 2 / OIDC", "M", "S1", "planned", "Keycloak in the proposed stack."],
    ["WP-ERX-06", "Event-driven internal design", "تصميم قائم على الأحداث", "M", "S2", "planned", "Outbox + queue in production."],
    ["WP-ERX-07", "Vendor-agnostic, tool-based AI layer", "طبقة ذكاء مستقلة عن المزود", "M", "S1", "built", "Claude or rules engine behind one interface."],
    ["WP-ERX-08", "Modular monolith with Hub as a core service, OpenAPI", "نظام معياري موحد", "M", "S1", "planned", "Prototype is front-end; NestJS modules in production."],
    ["WP-ERX-09", "Extension guide: ERD, API, adding verticals and connectors", "دليل التوسعة", "S", "S2", "planned", ""],
  ],
  "8": [
    ["NFR-PER-01", "LCP ≤ 2.5 s on 4G; search p95 ≤ 500 ms; WebP/AVIF", "الأداء", "—", "All", "partial", "Optimised images; load testing in production."],
    ["NFR-SCA-01", "50,000 listings, 1,000 concurrent users, 10× headroom", "قابلية التوسع", "—", "All", "planned", ""],
    ["NFR-AVL-01", "≥ 99.5% uptime, 24×7 monitoring", "التوفر", "—", "All", "planned", ""],
    ["NFR-REL-01", "Durable jobs, controlled retries, clear failed states", "الموثوقية", "—", "All", "partial", "Shown in the Hub; durable queue in production.", "/hub"],
    ["NFR-BCK-01", "Daily backups, 30-day retention, RPO 24 h, RTO 4 h", "النسخ الاحتياطي", "—", "All", "planned", ""],
    ["NFR-SEC-01", "OWASP ASVS L2, TLS, encryption, vault, WAF", "الأمان", "—", "All", "planned", ""],
    ["NFR-SEC-02", "Independent penetration test before launch", "اختبار الاختراق", "—", "All", "planned", "Arranged by AqarPro."],
    ["NFR-SEC-03", "No card data stored; PCI DSS hosted pages", "أمان المدفوعات", "—", "All", "simulated", "Hosted-page flow shown at checkout.", "/pricing"],
    ["NFR-PRV-01", "Qatar Law No. 13 of 2016: consent, DSR, retention", "الخصوصية", "—", "All", "partial", "Consent log in place; DSR workflow in production."],
    ["NFR-LEG-01", "Configurable advertising/licensing fields (permit no.)", "حقول الترخيص", "—", "All", "built", "Permit number checked by moderation (D-04).", "/admin?tab=moderation"],
    ["NFR-I18-01", "RTL/LTR, Hijri/Gregorian, QAR, Arabic-aware search", "التوطين", "—", "All", "built", "", "/ar"],
    ["NFR-ACC-01", "WCAG 2.1 AA for public pages", "إمكانية الوصول", "—", "All", "partial", "AA contrast on brand colours; formal audit in production."],
    ["NFR-MNT-01", "API-first, ≥ 70% test coverage, CI/CD, IaC", "قابلية الصيانة", "—", "All", "planned", ""],
    ["NFR-GIT-01", "Git in AqarPro-owned repos; dev/staging/prod", "إدارة الشيفرة", "—", "All", "partial", "Prototype is under Git; transfer to AqarPro org at kick-off."],
    ["NFR-OBS-01", "Logging, metrics, tracing, integration health", "المراقبة", "—", "All", "planned", ""],
    ["NFR-HOS-01", "AqarPro-owned cloud, Qatar/GCC region", "الاستضافة", "—", "All", "planned", "Decision D-05."],
    ["NFR-DOC-01", "Architecture, OpenAPI, runbook, guides", "التوثيق", "—", "All", "partial", "README and this roadmap; full set in production."],
  ],
};

export const requirements: Requirement[] = Object.entries(raw).flatMap(([section, rows]) =>
  rows.map(([id, en, ar, pri, stage, status, note, link]) => ({ id, section, title: { en, ar }, pri, stage, status, note, link })),
);

export const statusLabel: Record<ReqStatus, Bi> = {
  built: { en: "Built", ar: "منجز" },
  simulated: { en: "Simulated", ar: "محاكاة" },
  partial: { en: "Partial", ar: "جزئي" },
  planned: { en: "Production", ar: "للإنتاج" },
};

/** Milestones from spec §10 (timing deliberately omitted — set in the proposal). */
export const milestones: { id: string; stage: "S0" | "S1" | "S2" | "—"; name: Bi; scope: Bi; acceptance: Bi }[] = [
  { id: "Advance", stage: "—", name: { en: "Contract and set-up", ar: "العقد والتجهيز" }, scope: { en: "Contract signed, repositories and accounts set up", ar: "توقيع العقد وإعداد المستودعات والحسابات" }, acceptance: { en: "Signed contract", ar: "عقد موقّع" } },
  { id: "M0", stage: "S0", name: { en: "Audit and design", ar: "التدقيق والتصميم" }, scope: { en: "Prototype audit, requirements validation, AR/EN UX/UI, architecture, risk register, decisions D-02 to D-09", ar: "تدقيق النموذج، التحقق من المتطلبات، تصميم الواجهات، البنية، سجل المخاطر، القرارات" }, acceptance: { en: "Approved audit, scope baseline, design and delivery plan", ar: "اعتماد التدقيق وخط الأساس والتصميم وخطة التسليم" } },
  { id: "M1", stage: "S1", name: { en: "Foundation", ar: "الأساس" }, scope: { en: "Auth, organisations, roles, property model, storage, environments, CI/CD, monitoring", ar: "الدخول والمؤسسات والأدوار ونموذج العقار والتخزين وبيئات العمل" }, acceptance: { en: "Secure workspace manages properties; tenant-isolation tests pass", ar: "مساحة عمل آمنة واجتياز اختبارات العزل" } },
  { id: "M2", stage: "S1", name: { en: "Hub core", ar: "نواة مركز الربط" }, scope: { en: "Connector interface, mappings, validation, queue, dashboard, audit, mock connector", ar: "واجهة الموصلات والمطابقة والتحقق والطابور واللوحة والموصل التجريبي" }, acceptance: { en: "End-to-end simulated publish / update / failure / retry", ar: "نشر وتحديث وفشل وإعادة محاكاة من البداية للنهاية" } },
  { id: "M3", stage: "S1", name: { en: "AI Listing Studio", ar: "استوديو الإعلانات الذكي" }, scope: { en: "AI intake, bilingual content, quality checks, approval, usage tracking", ar: "الإدخال الذكي والمحتوى الثنائي والفحص والموافقة وتتبع الاستخدام" }, acceptance: { en: "Reviewable listing created and validated", ar: "إنشاء إعلان قابل للمراجعة والتحقق منه" } },
  { id: "M4", stage: "S1", name: { en: "Commercial launch (S1)", ar: "الإطلاق التجاري (S1)" }, scope: { en: "Public website, listings, moderation, plans and billing, basic leads and WhatsApp, Pixel/CAPI, on-site ads, SEO, admin, security hardening", ar: "الموقع والإعلانات والمراجعة والباقات والفوترة والعملاء وواتساب الأساسي والبكسل والإعلانات والإدارة" }, acceptance: { en: "Public beta, then commercial launch accepted; pen-test critical/high closed", ar: "إطلاق تجريبي ثم تجاري وإغلاق ثغرات الاختبار الحرجة" } },
  { id: "M5", stage: "S2", name: { en: "Messaging, agents and live connector", ar: "المراسلة والوكلاء والموصل الحي" }, scope: { en: "WhatsApp packs and inbox, lead routing, Meta campaign tools, marketing and support agents, first live portal connector", ar: "ملفات واتساب والصندوق وتوجيه العملاء وأدوات ميتا والوكلاء وأول موصل حي" }, acceptance: { en: "WhatsApp and AI release accepted; live connector tested or agreed alternative", ar: "قبول إصدار واتساب والذكاء واختبار الموصل الحي" } },
  { id: "M6", stage: "S2", name: { en: "Final acceptance and handover", ar: "القبول النهائي والتسليم" }, scope: { en: "Final QA, documentation, training, ownership transfer", ar: "الاختبار النهائي والتوثيق والتدريب ونقل الملكية" }, acceptance: { en: "Signed acceptance certificate and complete handover", ar: "شهادة قبول موقعة وتسليم كامل" } },
];

/** Stage bucket used for filtering: S1/S2 items count in both. */
export const inStage = (r: Requirement, s: "S1" | "S2") => r.stage === s || r.stage === "S1/S2" || r.stage === "All";
