import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDashed, KeyRound, RefreshCw, Wrench } from "lucide-react";
import { Card } from "@/components/ui";
import { StageBadge } from "@/lib/stage";
import { isLocale, tr, type Locale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Prototype audit (S0)", robots: { index: false } };

type Rec = "retain" | "refactor" | "rebuild";

const modules: { area: string; today: string; rec: Rec; why: string }[] = [
  { area: "UI components & bilingual design system", today: "Next.js + Tailwind, AR/EN with full RTL, brand tokens, shared Card/Badge/Button primitives.", rec: "retain", why: "Matches the target stack; logical CSS properties already make RTL correct by construction." },
  { area: "Page flows (search, listing, dashboards, admin, inbox)", today: "Complete clickable journeys for UAT scenarios C1–C6.", rec: "refactor", why: "Keep layouts and copy; replace in-browser state calls with typed API clients and server components." },
  { area: "Data & persistence", today: "Client-side store in browser localStorage; seed data in TypeScript files.", rec: "rebuild", why: "Production needs PostgreSQL + PostGIS behind an API, migrations, org-scoped queries and backups (NFR-BCK-01)." },
  { area: "Authentication, roles & tenancy", today: "No real login; role switcher simulates owner / manager / agent / read-only.", rec: "rebuild", why: "OIDC (Keycloak) with 2FA, and tenant isolation enforced in backend data access with cross-tenant tests (WP-ERX-01/05)." },
  { area: "Portal Integration Hub", today: "Capability registry, field mapping/validation, job states, idempotent retry — executed in the browser against two mock portals.", rec: "refactor", why: "Keep the connector contract and validation rules; move orchestration to a durable server-side queue; mock connectors stay as test doubles (HUB-11)." },
  { area: "AI Listing Studio", today: "Extraction and AR/EN drafting via rules/templates; AI-suggested fields flagged; credits metered.", rec: "refactor", why: "Keep the review UX and quality checks; add LLM, OCR and speech-to-text behind the provider abstraction (AIS-05)." },
  { area: "AI assistant (rules engine)", today: "Deterministic bilingual intent parser with tool-based retrieval over live listings.", rec: "retain", why: "Useful as an offline fallback and for evaluation baselines." },
  { area: "Claude integration", today: "Server route with tool use, grounding validation and refusal fallback; runs only when an API key is set.", rec: "refactor", why: "Move behind the vendor-agnostic AI layer with tenant context, logging and cost dashboards (WP-ERX-07, WP-SUP-08)." },
  { area: "WhatsApp, Meta, payments, email/SMS", today: "Simulated with realistic message shapes, webhooks and logs; no external calls.", rec: "rebuild", why: "Real Cloud API, Marketing API/CAPI, gateway and providers with verified webhooks and secrets in a vault." },
  { area: "Moderation, compliance, audit trail", today: "Auto-checks, queues, report → resubmit loop, compliance checklist, hash-chained audit view.", rec: "refactor", why: "Rules carry over; audit log becomes append-only storage server-side (FR-ADM-05)." },
];

const recStyle: Record<Rec, { cls: string; en: string; ar: string; icon: typeof CheckCircle2 }> = {
  retain: { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", en: "Retain", ar: "إبقاء", icon: CheckCircle2 },
  refactor: { cls: "bg-amber-50 text-amber-700 ring-amber-200", en: "Refactor", ar: "إعادة هيكلة", icon: Wrench },
  rebuild: { cls: "bg-red-50 text-red-700 ring-red-200", en: "Rebuild", ar: "إعادة بناء", icon: RefreshCw },
};

export default async function AuditPage({ params }: PageProps<"/[lang]/audit">) {
  const { lang: raw } = await params;
  const lang: Locale = isLocale(raw) ? raw : "en";
  const t = (en: string, ar: string) => tr(lang, en, ar);
  const h = (p: string) => `/${lang}${p}`;

  const reviews: { title: string; items: string[] }[] = [
    {
      title: t("Security", "الأمان"),
      items: [
        "No authentication or server-side authorisation — acceptable for a demo, a blocker for production.",
        "No secrets are stored in the client; the optional Claude key is read server-side only.",
        "The assistant API has a simple per-IP rate limit; production adds WAF, OWASP ASVS L2 controls and a pen test (NFR-SEC-01/02).",
      ],
    },
    {
      title: t("Data model", "نموذج البيانات"),
      items: [
        "Principal entities from spec §9 exist as typed models: organisations, listings, portal listings, publish jobs, leads, conversations, consents, plans, invoices, audit log.",
        "Every record carries an organisation ID; the canonical listing is separate from portal versions (FR-LST-12).",
        "Gaps: no migrations, constraints or indexes; listing-type engine (WP-ERX-04) not yet modelled.",
      ],
    },
    {
      title: t("Dependencies", "الاعتماديات"),
      items: [
        "Next.js 16, React 19, Tailwind 4, Leaflet/react-leaflet, lucide-react, Anthropic SDK — all permissive licences (MIT/BSD/ISC/Apache-2.0), no copyleft.",
        "Demo photos from Unsplash (Unsplash licence) must be replaced with real listing media.",
      ],
    },
    {
      title: t("Hosting & deployment", "الاستضافة والنشر"),
      items: [
        "Runs as a single Next.js app (local or a static/edge host). No environments, CI/CD, IaC or monitoring yet.",
        "Target: AqarPro-owned cloud in a Qatar/GCC region with dev/staging/prod, Terraform, CI/CD and observability (NFR-HOS-01, NFR-MNT-01, NFR-OBS-01).",
      ],
    },
    {
      title: t("Technical debt", "الدين التقني"),
      items: [
        "Business logic lives in React components; must move to API services with ≥ 70% test coverage.",
        "Time-based demo data is re-based on page load; replace with real timestamps.",
        "No automated tests today beyond type checks and linting.",
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600">
        <StageBadge s="S0" /> AQP-REQ-001 §4 · AqarPro
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{t("Prototype audit", "تدقيق النموذج الأولي")}</h1>
      <p className="mt-2 max-w-3xl text-sm text-stone-600">
        {t(
          "The specification requires that nothing in the prototype is assumed production-ready. This report separates what works from what is simulated, and recommends what to retain, refactor or rebuild.",
          "تشترط الوثيقة عدم افتراض جاهزية أي جزء من النموذج للإنتاج. يفصل هذا التقرير بين ما يعمل وما هو محاكى، ويوصي بما يُبقى أو يُعاد هيكلته أو يُعاد بناؤه.",
        )}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {t("Working in the prototype", "يعمل في النموذج")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
            <li>• Bilingual AR/EN UI with RTL, Hijri dates and Arabic-aware search</li>
            <li>• Search, map, listing pages, moderation auto-checks, report → resubmit</li>
            <li>• Portal Hub logic: mapping, validation, idempotent retry, status dashboard</li>
            <li>• AI Listing Studio checks and AI-suggested-field marking</li>
            <li>• Lead manager: assignment, tasks, duplicates, reporting</li>
            <li>• AI assistant grounding (Claude when a key is configured)</li>
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <CircleDashed className="h-5 w-5 text-amber-600" />
            {t("Simulated", "محاكى")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
            <li>• Login, OTP, 2FA and server-side roles</li>
            <li>• External portals (two mock connectors), WhatsApp Cloud API, Meta APIs</li>
            <li>• Payment gateway, 3-D Secure and callbacks</li>
            <li>• Email/SMS delivery, OCR and speech-to-text</li>
            <li>• Persistence: browser storage, not a database</li>
          </ul>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="font-bold text-stone-900">{t("Module recommendations", "التوصيات حسب الوحدة")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2 text-start font-semibold">{t("Module", "الوحدة")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("In the prototype today", "الوضع الحالي")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Recommendation", "التوصية")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Reason", "السبب")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100" dir="ltr">
              {modules.map((m) => {
                const r = recStyle[m.rec];
                return (
                  <tr key={m.area} className="align-top">
                    <td className="px-4 py-3 font-semibold text-stone-900">{m.area}</td>
                    <td className="px-4 py-3 text-stone-600">{m.today}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${r.cls}`}>
                        <r.icon className="h-3.5 w-3.5" />
                        {tr(lang, r.en, r.ar)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{m.why}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {reviews.map((r) => (
          <Card key={r.title} className="p-5">
            <h3 className="font-bold text-stone-900">{r.title}</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-600" dir="ltr">
              {r.items.map((i) => (
                <li key={i}>• {i}</li>
              ))}
            </ul>
          </Card>
        ))}
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-bold text-stone-900">
            <KeyRound className="h-4 w-4 text-brand-600" />
            {t("Access needed for the audit", "الوصول المطلوب للتدقيق")}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-600" dir="ltr">
            <li>• Read access to the prototype repository (to be moved into an AqarPro-owned GitHub organisation)</li>
            <li>• Any hosting/deployment the prototype runs on, and its environment variables</li>
            <li>• Existing brand assets, content and documentation</li>
            <li>• Contacts for portal, WhatsApp, Meta and payment-gateway accounts (decisions D-02 to D-09)</li>
          </ul>
        </Card>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          {t(
            "Any audit finding that changes price or schedule is raised in writing through change control (spec §12) before work continues.",
            "أي نتيجة تدقيق تغيّر السعر أو الجدول الزمني تُرفع كتابياً عبر إدارة التغيير (القسم 12) قبل متابعة العمل.",
          )}{" "}
          <Link href={h("/roadmap")} className="font-semibold underline">
            {t("See the roadmap", "عرض خارطة الطريق")}
          </Link>
        </p>
      </div>
    </div>
  );
}
