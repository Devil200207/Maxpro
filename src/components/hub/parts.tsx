"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, Loader2, RotateCw, ShieldAlert, UserCheck, XCircle } from "lucide-react";
import type { Bi } from "@/lib/i18n";
import { portalById } from "@/lib/portals";
import { useStore, type OrgRole, type PortalListingStatus, type PublishJob } from "@/lib/store";
import { useLang } from "@/lib/useLang";
import { cn } from "@/components/ui";
import { isInterrupted } from "./useHubRunner";

export const plStatus: Record<PortalListingStatus, { label: Bi; cls: string; icon: typeof Clock; action?: Bi }> = {
  draft: { label: { en: "Validated", ar: "تم التحقق" }, cls: "bg-stone-100 text-stone-700", icon: CircleDashed, action: { en: "Approve publishing", ar: "اعتماد النشر" } },
  needs_fix: { label: { en: "Needs fix", ar: "يحتاج تصحيح" }, cls: "bg-red-50 text-red-700", icon: AlertTriangle, action: { en: "Fix the flagged field", ar: "صحّح الحقل المحدد" } },
  ready: { label: { en: "Awaiting approval", ar: "بانتظار الاعتماد" }, cls: "bg-amber-50 text-amber-800", icon: UserCheck, action: { en: "Manager to approve", ar: "بانتظار اعتماد المدير" } },
  queued: { label: { en: "Queued", ar: "في الطابور" }, cls: "bg-sky-50 text-sky-700", icon: Clock },
  publishing: { label: { en: "Publishing…", ar: "جارٍ النشر…" }, cls: "bg-sky-50 text-sky-700", icon: Loader2 },
  published: { label: { en: "Published", ar: "منشور" }, cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  timeout: { label: { en: "Timed out — retrying", ar: "انتهت المهلة — إعادة المحاولة" }, cls: "bg-amber-50 text-amber-800", icon: RotateCw, action: { en: "Automatic safe retry", ar: "إعادة آمنة تلقائية" } },
  failed: { label: { en: "Failed", ar: "فشل" }, cls: "bg-red-50 text-red-700", icon: XCircle, action: { en: "Check log and reprocess", ar: "راجع السجل وأعد المعالجة" } },
  unpublished: { label: { en: "Unpublished", ar: "أُلغي النشر" }, cls: "bg-stone-100 text-stone-500", icon: XCircle },
};

export function PlStatusBadge({ status }: { status: PortalListingStatus }) {
  const { p } = useLang();
  const s = plStatus[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", s.cls)}>
      <s.icon className={cn("h-3.5 w-3.5", status === "publishing" && "animate-spin")} />
      {p(s.label)}
    </span>
  );
}

const jobCls: Record<PublishJob["status"], string> = {
  queued: "bg-sky-50 text-sky-700",
  running: "bg-sky-50 text-sky-700",
  retrying: "bg-amber-50 text-amber-800",
  timeout: "bg-amber-50 text-amber-800",
  succeeded: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-stone-100 text-stone-500",
};

export function JobStatusBadge({ job }: { job: PublishJob }) {
  const { t } = useLang();
  if (isInterrupted(job))
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
        <ShieldAlert className="h-3.5 w-3.5" />
        {t("Unknown — reconcile", "غير معروف — تسوية")}
      </span>
    );
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", jobCls[job.status])}>{job.status}</span>;
}

export function JobLog({ job, max }: { job: PublishJob; max?: number }) {
  const rows = max ? job.log.slice(-max) : job.log;
  return (
    <ol className="space-y-1 rounded-lg bg-stone-950 p-2.5 font-mono text-[11px] leading-relaxed" dir="ltr">
      {rows.map((l, i) => (
        <li key={i} className={cn(l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-300" : "text-emerald-300")}>
          <span className="text-stone-500">{new Date(l.at).toLocaleTimeString("en-GB")} </span>
          {l.msg}
        </li>
      ))}
    </ol>
  );
}

export function PortalChip({ portalId }: { portalId: string }) {
  const { p } = useLang();
  const portal = portalById(portalId);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-800">
      <span className="grid h-5 w-5 place-items-center rounded text-[10px] font-bold text-white" style={{ background: portal.color }}>
        {portal.short}
      </span>
      {p(portal.name)}
    </span>
  );
}

const roleLabel: Record<OrgRole, Bi> = {
  owner: { en: "Owner", ar: "المالك" },
  manager: { en: "Manager", ar: "مدير" },
  agent: { en: "Agent", ar: "وكيل" },
  readonly: { en: "Read-only", ar: "قراءة فقط" },
};
export const roleName = (r: OrgRole) => roleLabel[r];

/** Demo control: act as another member of the agency to show role-based approval. */
export function ActingAs() {
  const { state, update } = useStore();
  const { t, p } = useLang();
  const org = state.advertisers.find((a) => a.id === state.session.advertiserId)?.orgId;
  const members = state.team.filter((m) => m.orgId === org && m.status === "active");
  if (!members.length) return null;
  return (
    <label className="flex items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-600">
      {t("Acting as", "تعمل باسم")}
      <select
        value={state.session.memberId}
        onChange={(e) => {
          const m = members.find((x) => x.id === e.target.value)!;
          update((s) => ({ ...s, session: { ...s.session, memberId: m.id, role: m.role } }));
        }}
        className="rounded border-0 bg-transparent py-0 text-xs font-semibold text-stone-900 focus:ring-0"
      >
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {p(roleLabel[m.role])}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Current actor for audit entries. */
export function useActor() {
  const { state } = useStore();
  const m = state.team.find((x) => x.id === state.session.memberId);
  return { name: m ? `${m.name} (${state.session.role})` : "Advertiser", role: "advertiser" as const, member: m, sessionRole: state.session.role };
}

const noop = () => () => {};
/** True only after hydration — for values read from localStorage or the clock. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
