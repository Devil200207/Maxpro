"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, Search, UserRoundCog, Users } from "lucide-react";
import { advertiserById } from "@/lib/data";
import { gregorian, timeAgo } from "@/lib/format";
import { findDuplicate, isOverdue, leadSourceOf, pickAssignee, type LeadSource } from "@/lib/leads";
import { StageBadge } from "@/lib/stage";
import { uid, useStore, type Lead, type OrgRole } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { downloadCsv, useNow } from "../inbox/channel";
import { toast } from "../Toaster";
import { Badge, btn, Card, cn, input, ReqTag } from "../ui";
import { LeadDetail } from "./LeadDetail";
import { LeadReports, statusName } from "./LeadReports";
import { sourceMeta } from "./sources";

const roleName = (r: OrgRole, t: (en: string, ar: string) => string) =>
  ({ owner: t("Owner", "المالك"), manager: t("Manager", "مدير"), agent: t("Agent", "وكيل"), readonly: t("Read-only", "قراءة فقط") })[r];

/**
 * Central lead manager (LED-01..06). Role-aware: agents see their own leads, owners and
 * managers see and assign everything, read-only users can only look.
 */
export function LeadManager({ compact }: { compact?: boolean }) {
  const { lang, t, p } = useLang();
  const { state, update } = useStore();
  const now = useNow(30000);
  const { session } = state;
  const org = advertiserById(session.advertiserId);
  const team = state.team.filter((m) => m.orgId === org.orgId);
  const role = session.role;
  const canAssign = role === "owner" || role === "manager";
  const canEdit = role !== "readonly";

  const [q, setQ] = useState("");
  const [source, setSource] = useState<LeadSource | "all">("all");
  const [status, setStatus] = useState<Lead["status"] | "all">("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(!compact);

  const scoped = useMemo(
    () =>
      state.leads.filter(
        (l) => l.advertiserId === session.advertiserId && !l.duplicateOf && (role !== "agent" || l.assignee === session.memberId),
      ),
    [state.leads, session.advertiserId, session.memberId, role],
  );

  const list = scoped
    .filter((l) => source === "all" || leadSourceOf(l) === source)
    .filter((l) => status === "all" || l.status === status)
    .filter((l) => assignee === "all" || (assignee === "none" ? !l.assignee : l.assignee === assignee))
    .filter((l) => !overdueOnly || (now !== null && isOverdue(l, now)))
    .filter((l) => {
      const s = q.trim().toLowerCase();
      return !s || [l.name, l.phone, l.listingId, l.message, l.source, l.id].some((x) => x?.toLowerCase().includes(s));
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const open = openId ? state.leads.find((l) => l.id === openId) : undefined;
  const unassigned = scoped.filter((l) => !l.assignee && l.status !== "closed");
  const overdueCount = now === null ? 0 : scoped.filter((l) => isOverdue(l, now)).length;
  const dupCount = scoped.filter((l) => findDuplicate(state.leads, l)).length;
  const memberName = (id?: string) => team.find((m) => m.id === id)?.name;

  const autoAssignAll = () => {
    const at = new Date().toISOString();
    const n = unassigned.length;
    update((s) => {
      let next = s;
      for (const l of next.leads.filter((x) => x.advertiserId === session.advertiserId && !x.assignee && !x.duplicateOf && x.status !== "closed")) {
        const a = pickAssignee(next, l.advertiserId, l.listingId);
        if (!a) continue;
        next = { ...next, leads: next.leads.map((x) => (x.id === l.id ? { ...x, assignee: a } : x)) };
      }
      return { ...next, audit: [{ id: uid("A"), at, actor: memberName(session.memberId) ?? "Manager", role: "advertiser", action: "lead.auto_assigned", detail: `${n} leads` }, ...next.audit] };
    });
    toast(t(`${n} leads auto-assigned`, `تم إسناد ${n} عملاء تلقائياً`));
  };

  const exportCsv = () =>
    downloadCsv(`aqarpro-leads-${org.orgId}.csv`, [
      ["id", "created", "name", "phone", "source", "channel", "source_detail", "listing", "status", "outcome", "score", "assignee", "first_response", "open_tasks"],
      ...list.map((l) => [
        l.id,
        l.createdAt,
        l.name,
        l.phone,
        leadSourceOf(l),
        l.channel,
        l.source,
        l.listingId,
        l.status,
        l.outcome,
        l.score,
        memberName(l.assignee),
        l.firstResponseAt,
        (l.tasks ?? []).filter((x) => !x.done).length,
      ]),
    ]);

  const switchView = (memberId: string) => {
    const m = team.find((x) => x.id === memberId);
    if (!m) return;
    update((s) => ({ ...s, session: { ...s.session, memberId: m.id, role: m.role } }));
    setOpenId(null);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Users className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-stone-900">{t("Leads", "العملاء")}</h2>
            <StageBadge s="S1" />
            <span className="text-xs text-stone-400">
              {t(`${scoped.length} active`, `${scoped.length} نشط`)} · {roleName(role, t)}
              {role === "agent" ? t(" (your leads only)", " (عملاؤك فقط)") : ""}
            </span>
            <ReqTag id="LED-01" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!compact && team.length > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-stone-500" title={t("Demo: preview the lead manager as another team member", "عرض تجريبي: معاينة كعضو آخر")}>
                <UserRoundCog className="h-4 w-4" />
                <select value={session.memberId} onChange={(e) => switchView(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs">
                  {team.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {roleName(m.role, t)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {canAssign && unassigned.length > 0 && (
              <button onClick={autoAssignAll} className={cn(btn.secondary, "px-3 py-1.5 text-xs")}>
                {t(`Auto-assign ${unassigned.length}`, `إسناد ${unassigned.length} تلقائياً`)}
              </button>
            )}
            <button onClick={exportCsv} className={cn(btn.secondary, "px-3 py-1.5 text-xs")}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
            <button onClick={() => setShowReports((v) => !v)} className={cn(btn.secondary, "px-3 py-1.5 text-xs")}>
              {showReports ? t("Hide reports", "إخفاء التقارير") : t("Show reports", "عرض التقارير")}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search name, phone, listing…", "ابحث بالاسم أو الهاتف أو الإعلان…")} className={cn(input, "py-2 ps-9")} />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", "web", "whatsapp", "ai", "meta", "portal"] as const).map((s) => {
              const meta = s === "all" ? null : sourceMeta[s];
              const n = s === "all" ? scoped.length : scoped.filter((l) => leadSourceOf(l) === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium", source === s ? "border-brand-600 bg-brand-50 text-brand-700" : "border-stone-200 text-stone-600 hover:bg-stone-50")}
                >
                  {meta && <meta.icon className="h-3 w-3" />}
                  {meta ? p(meta.name) : t("All", "الكل")} <span className="text-stone-400">{n}</span>
                </button>
              );
            })}
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as Lead["status"] | "all")} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs">
            <option value="all">{t("All statuses", "كل الحالات")}</option>
            {(["new", "contacted", "viewing", "closed"] as const).map((s) => (
              <option key={s} value={s}>
                {statusName(s, t)}
              </option>
            ))}
          </select>
          {role !== "agent" && (
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs">
              <option value="all">{t("Everyone", "الجميع")}</option>
              <option value="none">{t("Unassigned", "غير مسند")}</option>
              {team
                .filter((m) => m.role !== "readonly")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          )}
          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", overdueOnly ? "border-red-300 bg-red-50 text-red-700" : "border-stone-200 text-stone-600")}
          >
            {t(`Overdue tasks (${overdueCount})`, `مهام متأخرة (${overdueCount})`)}
          </button>
        </div>
        {dupCount > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t(`${dupCount} possible duplicate(s) — open a lead to review and merge.`, `${dupCount} احتمال تكرار — افتح العميل للمراجعة والدمج.`)}
            <ReqTag id="LED-03" />
          </div>
        )}
        {!canEdit && <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">{t("Read-only access: you can view leads and reports but not change them.", "صلاحية قراءة فقط: يمكنك عرض العملاء والتقارير دون تعديلها.")}</div>}
      </Card>

      {showReports && <LeadReports leads={scoped} team={team} />}

      <div className={cn("grid grid-cols-1 gap-4", open && "xl:grid-cols-[1fr_440px]")}>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("Lead", "العميل")}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t("Source", "المصدر")}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t("Listing", "الإعلان")}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t("Score", "التقييم")}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t("Status", "الحالة")}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t("Assignee", "المسؤول")}</th>
                  <th className="px-3 py-2.5 text-start font-medium">{t("Received", "وصل")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {list.map((l) => {
                  const src = sourceMeta[leadSourceOf(l)];
                  const overdue = now !== null && isOverdue(l, now);
                  const dup = findDuplicate(state.leads, l);
                  return (
                    <tr key={l.id} onClick={() => setOpenId(l.id)} className={cn("cursor-pointer hover:bg-stone-50", openId === l.id && "bg-brand-50/60")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-stone-900">
                          {l.name}
                          {dup && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label={t("Possible duplicate", "احتمال تكرار")} />}
                          {overdue && <Badge tone="red">{t("Overdue", "متأخر")}</Badge>}
                        </div>
                        <div className="line-clamp-1 max-w-xs text-xs text-stone-500">{l.message}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", src.cls)}>
                          <src.icon className="h-3 w-3" />
                          {p(src.name)}
                        </span>
                        {l.source && <div className="mt-0.5 line-clamp-1 max-w-[180px] text-[11px] text-stone-400">{l.source}</div>}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-stone-600">{l.listingId ?? "—"}</td>
                      <td className="px-3 py-3">
                        {l.score !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-stone-100">
                              <div className={cn("h-full", l.score >= 80 ? "bg-emerald-500" : l.score >= 60 ? "bg-amber-500" : "bg-stone-400")} style={{ width: `${l.score}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-stone-700">{l.score}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={l.status === "new" ? "blue" : l.status === "contacted" ? "amber" : l.status === "viewing" ? "violet" : l.outcome === "won" ? "green" : "stone"}>
                          {statusName(l.status, t)}
                          {l.outcome ? ` · ${l.outcome === "won" ? t("won", "مكسوب") : t("lost", "مفقود")}` : ""}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-stone-600">{memberName(l.assignee) ?? <span className="text-amber-700">{t("Unassigned", "غير مسند")}</span>}</td>
                      <td className="px-3 py-3 text-xs text-stone-500">{now !== null ? timeAgo(l.createdAt, lang) : gregorian(l.createdAt, lang)}</td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-stone-400">
                      {t("No leads match these filters.", "لا يوجد عملاء مطابقون لهذه الفلاتر.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/30 xl:hidden" onClick={() => setOpenId(null)} />
            <Card className="fixed inset-y-0 end-0 z-50 w-full max-w-md overflow-hidden rounded-none xl:sticky xl:top-20 xl:z-0 xl:h-[calc(100vh-6rem)] xl:max-w-none xl:rounded-2xl">
              <LeadDetail key={open.id} lead={open} now={now} canEdit={canEdit} canAssign={canAssign} onClose={() => setOpenId(null)} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
