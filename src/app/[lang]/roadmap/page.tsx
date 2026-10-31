"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Search } from "lucide-react";
import { Card, cn, input } from "@/components/ui";
import { StageBadge, useStage } from "@/lib/stage";
import { useLang } from "@/lib/useLang";
import { inStage, milestones, requirements, sections, statusLabel, type ReqStatus, type Requirement } from "@/lib/requirements";

const statusTone: Record<ReqStatus, string> = {
  built: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  simulated: "bg-sky-50 text-sky-700 ring-sky-200",
  partial: "bg-amber-50 text-amber-700 ring-amber-200",
  planned: "bg-stone-100 text-stone-600 ring-stone-200",
};

function StagePills({ r }: { r: Requirement }) {
  if (r.stage === "S1/S2")
    return (
      <span className="inline-flex gap-1">
        <StageBadge s="S1" />
        <StageBadge s="S2" />
      </span>
    );
  if (r.stage === "All") return <span className="text-[10px] font-semibold text-stone-500">ALL</span>;
  return <StageBadge s={r.stage} />;
}

export default function RoadmapPage() {
  const { t, p, href } = useLang();
  const { view } = useStage();
  const [stage, setStage] = useState<"" | "S1" | "S2" | "All">("");
  const [pri, setPri] = useState<"" | "M" | "S" | "C">("");
  const [status, setStatus] = useState<"" | ReqStatus>("");
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      requirements.filter((r) => {
        if (stage === "All" && r.stage !== "All") return false;
        if ((stage === "S1" || stage === "S2") && r.stage !== stage && r.stage !== "S1/S2") return false;
        if (pri && r.pri !== pri) return false;
        if (status && r.status !== status) return false;
        if (q) {
          const hay = `${r.id} ${r.title.en} ${r.title.ar} ${r.note}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      }),
    [stage, pri, status, q],
  );

  const count = (pred: (r: Requirement) => boolean) => requirements.filter(pred).length;
  const stages = [
    {
      s: "S0" as const,
      name: t("Discovery & audit", "الاكتشاف والتدقيق"),
      text: t("Prototype audit, requirements validation, UX/UI, architecture, open decisions.", "تدقيق النموذج والتحقق من المتطلبات والتصميم والبنية والقرارات المفتوحة."),
      n: null as number | null,
      link: "/audit",
    },
    {
      s: "S1" as const,
      name: t("Revenue-ready website", "موقع جاهز للإيرادات"),
      text: t("Website, accounts and roles, listings, Portal Hub with mock connector, AI Listing Studio, leads, plans and billing, basic WhatsApp, Pixel/CAPI, admin.", "الموقع والحسابات والأدوار والإعلانات ومركز الربط والاستوديو الذكي والعملاء والباقات وواتساب الأساسي والإدارة."),
      n: count((r) => inStage(r, "S1") && r.stage !== "All"),
      link: "/demo",
    },
    {
      s: "S2" as const,
      name: t("Messaging, agents & live connectors", "المراسلة والوكلاء والموصلات الحية"),
      text: t("WhatsApp packs and shared inbox, AI assistant, Meta campaigns and marketing agent, full lead routing, first live portal connector.", "ملفات واتساب والصندوق المشترك والمساعد الذكي وحملات ميتا وتوجيه العملاء وأول موصل حي."),
      n: count((r) => inStage(r, "S2") && r.stage !== "All"),
      link: "/demo",
    },
  ];

  const statuses: ReqStatus[] = ["built", "simulated", "partial", "planned"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">AQP-REQ-001 · AqarPro</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">{t("Roadmap by stage", "خارطة الطريق حسب المرحلة")}</h1>
      <p className="mt-2 max-w-3xl text-sm text-stone-500">
        {t(
          "Every requirement ID from the specification, with its priority and delivery stage, and what this prototype shows today. Use the S1 / S1 + S2 switch in the header to focus the demo on one stage.",
          "كل متطلبات الوثيقة مع الأولوية ومرحلة التسليم وما يعرضه هذا النموذج اليوم. استخدم مفتاح S1 / S1 + S2 في الأعلى للتركيز على مرحلة واحدة.",
        )}
      </p>

      {/* Stage overview */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {stages.map((s, i) => (
          <Card key={s.s} className={cn("relative p-5", view === "s1" && s.s === "S2" && "opacity-50")}>
            <div className="flex items-center gap-2">
              <StageBadge s={s.s} />
              <span className="font-bold text-stone-900">{s.name}</span>
            </div>
            <p className="mt-2 text-sm text-stone-600">{s.text}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
              <span>{s.n !== null ? `${s.n} ${t("requirements", "متطلباً")}` : t("Discovery phase", "مرحلة الاكتشاف")}</span>
              <Link href={href(s.link)} className="inline-flex items-center gap-1 font-semibold text-brand-600">
                {s.s === "S0" ? t("Audit report", "تقرير التدقيق") : t("Walkthrough", "الجولة")}
                <ArrowRight className="flip-rtl h-3.5 w-3.5" />
              </Link>
            </div>
            {i < 2 && <ArrowRight className="flip-rtl absolute -end-3.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white text-stone-400 shadow md:block" />}
          </Card>
        ))}
      </div>

      {/* Status counts */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? "" : s)}
            className={cn("rounded-xl border bg-white p-3 text-start transition hover:shadow-sm", status === s ? "border-brand-400 ring-2 ring-brand-100" : "border-stone-200")}
          >
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone[s])}>{p(statusLabel[s])}</span>
            <div className="mt-1 text-2xl font-bold text-stone-900">{count((r) => r.status === s)}</div>
            <div className="text-[11px] text-stone-500">
              {s === "built" && t("Working in the prototype", "يعمل في النموذج")}
              {s === "simulated" && t("Flow works; external system mocked", "التدفق يعمل والنظام الخارجي محاكى")}
              {s === "partial" && t("Part of the scope shown", "جزء من النطاق معروض")}
              {s === "planned" && t("Production work (e.g. load, security)", "عمل الإنتاج (الأداء، الأمان)")}
            </div>
          </button>
        ))}
      </div>

      {/* Milestones */}
      <Card className="mt-8 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-4">
          <h2 className="font-bold text-stone-900">{t("Milestones (spec §10)", "المراحل الرئيسية (القسم 10)")}</h2>
          <span className="text-xs text-stone-500">{t("Timing per proposal · payment on accepted milestones", "التوقيت حسب العرض · الدفع عند قبول كل مرحلة")}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2 text-start font-semibold">{t("Milestone", "المرحلة")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Stage", "المرحلة")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Scope", "النطاق")}</th>
                <th className="px-4 py-2 text-start font-semibold">{t("Acceptance deliverable", "مخرج القبول")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {milestones.map((m) => (
                <tr key={m.id} className={cn(view === "s1" && m.stage === "S2" && "opacity-40")}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-mono text-xs text-stone-500">{m.id}</div>
                    <div className="font-semibold text-stone-900">{p(m.name)}</div>
                  </td>
                  <td className="px-4 py-3 align-top">{m.stage === "—" ? <span className="text-stone-400">—</span> : <StageBadge s={m.stage} />}</td>
                  <td className="px-4 py-3 align-top text-stone-600">{p(m.scope)}</td>
                  <td className="px-4 py-3 align-top text-stone-600">{p(m.acceptance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Filters */}
      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-stone-900">
          {t("Requirements", "المتطلبات")} <span className="text-sm font-normal text-stone-500">({filtered.length}/{requirements.length})</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search ID or text", "ابحث بالرقم أو النص")} className={cn(input, "w-52 ps-9")} />
          </div>
          <select value={stage} onChange={(e) => setStage(e.target.value as typeof stage)} className={cn(input, "w-auto")}>
            <option value="">{t("All stages", "كل المراحل")}</option>
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="All">{t("Cross-cutting (NFR)", "عامة (غير وظيفية)")}</option>
          </select>
          <select value={pri} onChange={(e) => setPri(e.target.value as typeof pri)} className={cn(input, "w-auto")}>
            <option value="">{t("All priorities", "كل الأولويات")}</option>
            <option value="M">{t("Must", "إلزامي")}</option>
            <option value="S">{t("Should", "مستحسن")}</option>
            <option value="C">{t("Could", "اختياري")}</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={cn(input, "w-auto")}>
            <option value="">{t("All statuses", "كل الحالات")}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {p(statusLabel[s])}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {sections.map((sec) => {
          const rows = filtered.filter((r) => r.section === sec.id);
          if (!rows.length) return null;
          return (
            <Card key={sec.id} className="overflow-hidden">
              <div className="border-b border-stone-100 bg-stone-50 px-5 py-3 text-sm font-bold text-stone-900">
                <span className="me-2 font-mono text-xs text-stone-400">§{sec.id}</span>
                {p(sec.title)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <tbody className="divide-y divide-stone-100">
                    {rows.map((r) => {
                      const dim = view === "s1" && r.stage === "S2";
                      return (
                        <tr key={r.id} className={cn("align-top", dim && "opacity-40", view === "s1" && (r.stage === "S1" || r.stage === "S1/S2") && "bg-emerald-50/30")}>
                          <td className="w-28 px-4 py-3 font-mono text-xs font-semibold text-stone-700">{r.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-stone-900">{p(r.title)}</div>
                            {r.note && <div className="mt-0.5 text-xs text-stone-500">{r.note}</div>}
                          </td>
                          <td className="w-12 px-2 py-3 text-center text-xs font-bold text-stone-500" title={t("Priority (MoSCoW)", "الأولوية")}>
                            {r.pri}
                          </td>
                          <td className="w-24 px-2 py-3">
                            <StagePills r={r} />
                          </td>
                          <td className="w-28 px-2 py-3">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", statusTone[r.status])}>{p(statusLabel[r.status])}</span>
                          </td>
                          <td className="w-28 px-4 py-3 text-end">
                            {r.link && (
                              <Link href={href(r.link)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                                {t("Open", "فتح")}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {!filtered.length && <p className="py-10 text-center text-sm text-stone-500">{t("No requirements match these filters.", "لا توجد متطلبات مطابقة.")}</p>}
      </div>
    </div>
  );
}
