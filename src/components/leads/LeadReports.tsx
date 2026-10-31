"use client";

import { BarChart3 } from "lucide-react";
import type { Lead, TeamMember } from "@/lib/store";
import { leadSourceOf, responseMinutes, type LeadSource } from "@/lib/leads";
import { useLang } from "@/lib/useLang";
import { StageBadge } from "@/lib/stage";
import { Card, ReqTag } from "../ui";
import { sourceMeta } from "./sources";

/** LED-06: volume by source, response time, outcomes and per-agent load — pure CSS/SVG. */
export function LeadReports({ leads, team }: { leads: Lead[]; team: TeamMember[] }) {
  const { t, p } = useLang();
  const sources: LeadSource[] = ["web", "whatsapp", "ai", "meta", "portal"];
  const bySource = sources.map((s) => ({ s, n: leads.filter((l) => leadSourceOf(l) === s).length }));
  const max = Math.max(1, ...bySource.map((x) => x.n));
  const responded = leads.map(responseMinutes).filter((x): x is number => x !== undefined);
  const avgResp = responded.length ? Math.round(responded.reduce((a, b) => a + b, 0) / responded.length) : undefined;
  const won = leads.filter((l) => l.outcome === "won").length;
  const lost = leads.filter((l) => l.outcome === "lost").length;
  const closed = won + lost;
  const pct = closed ? Math.round((won / closed) * 100) : 0;
  const statusCounts = (["new", "contacted", "viewing", "closed"] as const).map((s) => ({ s, n: leads.filter((l) => l.status === s).length }));
  const agents = team.filter((m) => m.role === "agent" || m.role === "manager");
  const unassigned = leads.filter((l) => !l.assignee).length;

  const fmtMins = (m?: number) => (m === undefined ? "—" : m < 60 ? t(`${m} min`, `${m} د`) : t(`${(m / 60).toFixed(1)} h`, `${(m / 60).toFixed(1)} س`));

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-stone-900">
          <BarChart3 className="h-4 w-4 text-brand-600" />
          {t("Lead reports", "تقارير العملاء")}
          <StageBadge s="S1" />
        </h3>
        <ReqTag id="LED-06" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("Leads", "العملاء")} value={String(leads.length)} />
        <Kpi label={t("Avg first response", "متوسط أول رد")} value={fmtMins(avgResp)} hint={t(`${responded.length} responded`, `${responded.length} تم الرد`)} />
        <Kpi label={t("Won / lost", "مكسوب / مفقود")} value={`${won} / ${lost}`} hint={closed ? t(`${pct}% win rate`, `نسبة الفوز ${pct}٪`) : undefined} />
        <Kpi label={t("Unassigned", "غير مسندة")} value={String(unassigned)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <div className="mb-2 text-xs font-semibold text-stone-500">{t("Volume by source", "الحجم حسب المصدر")}</div>
          <div className="space-y-2">
            {bySource.map(({ s, n }) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-stone-600">{p(sourceMeta[s].name)}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full rounded-full ${sourceMeta[s].bar}`} style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="w-6 text-end font-semibold text-stone-800">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-stone-500">{t("Pipeline", "مراحل المتابعة")}</div>
          <div className="flex h-28 items-end gap-3" dir="ltr">
            {statusCounts.map(({ s, n }) => {
              const h = (n / Math.max(1, ...statusCounts.map((x) => x.n))) * 88;
              return (
                <div key={s} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-stone-700">{n}</span>
                  <div className="w-full rounded-t-md bg-brand-500/80" style={{ height: `${Math.max(4, h)}px` }} />
                  <span className="text-[10px] text-stone-500">{statusName(s, t)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold text-stone-500">{t("By team member", "حسب عضو الفريق")}</div>
          <table className="w-full text-xs">
            <thead className="text-stone-400">
              <tr>
                <th className="py-1 text-start font-medium">{t("Member", "العضو")}</th>
                <th className="py-1 text-end font-medium">{t("Open", "مفتوح")}</th>
                <th className="py-1 text-end font-medium">{t("Won", "مكسوب")}</th>
                <th className="py-1 text-end font-medium">{t("Avg resp.", "متوسط الرد")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {agents.map((m) => {
                const mine = leads.filter((l) => l.assignee === m.id);
                const r = mine.map(responseMinutes).filter((x): x is number => x !== undefined);
                return (
                  <tr key={m.id}>
                    <td className="py-1.5 text-stone-700">{m.name}</td>
                    <td className="py-1.5 text-end">{mine.filter((l) => l.status !== "closed").length}</td>
                    <td className="py-1.5 text-end">{mine.filter((l) => l.outcome === "won").length}</td>
                    <td className="py-1.5 text-end">{fmtMins(r.length ? Math.round(r.reduce((a, b) => a + b, 0) / r.length) : undefined)}</td>
                  </tr>
                );
              })}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-2 text-stone-400">
                    {t("No team members", "لا يوجد أعضاء")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

export function statusName(s: Lead["status"], t: (en: string, ar: string) => string) {
  return { new: t("New", "جديد"), contacted: t("Contacted", "تم التواصل"), viewing: t("Viewing", "معاينة"), closed: t("Closed", "مغلق") }[s];
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <div className="text-[11px] font-medium text-stone-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-stone-900">{value}</div>
      {hint && <div className="text-[11px] text-stone-400">{hint}</div>}
    </div>
  );
}
